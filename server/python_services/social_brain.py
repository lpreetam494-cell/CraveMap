import json
import sys
from typing import List, Dict

def identify_experts(peer_vectors: List[Dict]) -> dict:
    """Identify 'contributors' who have abnormal density of a tag based on their vectors."""
    experts = {}
    for vector in peer_vectors:
        user = vector.get('identity', 'Unknown')
        cuisines = vector.get('cuisines', {})
        total_cuisine_weight = sum(cuisines.values())
        if total_cuisine_weight > 0:
            for c, w in cuisines.items():
                if w / total_cuisine_weight >= 0.4: # 40% of their saves is this cuisine
                    experts.setdefault(c, []).append(user)
    return experts

def apply_negative_preferences(pooled_restaurants: dict, negative_prefs: list, group_cuisines: dict) -> dict:
    for pref in negative_prefs:
        reason = pref.get('reason', '')
        cuisine = (pref.get('cuisine') or '').lower()
        name = (pref.get('restaurant_name') or '').lower()
        weight = pref.get('session_weight', -2.0)

        if reason == 'dislike_cuisine' and cuisine:
            for c in list(group_cuisines.keys()):
                if cuisine in c or c in cuisine:
                    group_cuisines[c] = group_cuisines.get(c, 0) + weight * 2 

        if reason == 'too_expensive':
            for rname, r in pooled_restaurants.items():
                # Assuming budget strings like "$$$" - higher budget means more $
                if r.get('budget') and len(r.get('budget', '')) > 2:
                    r['_neg_score'] = r.get('_neg_score', 0) + weight

        if name and name in pooled_restaurants:
            pooled_restaurants[name]['_neg_score'] = pooled_restaurants[name].get('_neg_score', 0) + (weight * 3)

    return group_cuisines

def calculate_consensus(host_restaurants: list, peer_vectors: list, constraints: dict) -> dict:
    # Build a lookup pool
    pooled_restaurants = {}
    for r in host_restaurants:
        if r.get('name'):
            pooled_restaurants[r['name'].lower()] = r

    # Extract mood overrides
    mood = constraints.get('mood_overrides', {})
    vibe_boost = [v.lower() for v in mood.get('vibe_boost', [])]
    cuisine_boost = [c.lower() for c in mood.get('cuisine_boost', [])]
    cuisine_weight_multiplier = float(mood.get('cuisine_weight', 1.0))
    vibe_weight_multiplier = float(mood.get('vibe_weight', 1.0))
    ignore_budget = mood.get('ignore_budget', False)

    experts = identify_experts(peer_vectors)

    # Build weighted group cuisine and vibe vectors across all peers
    group_cuisines = {}
    group_vibes = {}

    for vector in peer_vectors:
        user = vector.get('identity', 'Unknown')
        for c, w in vector.get('cuisines', {}).items():
            multiplier = 1.5 if user in experts.get(c, []) else 1.0
            if any(v.lower() in c for v in constraints.get('vetoes', [])):
                multiplier = -1.0
            if any(boost in c or c in boost for boost in cuisine_boost):
                multiplier *= 2.0
            group_cuisines[c] = group_cuisines.get(c, 0) + (w * multiplier * cuisine_weight_multiplier)

        for v, w in vector.get('vibes', {}).items():
            v_mult = 1.0
            if any(boost in v or v in boost for boost in vibe_boost):
                v_mult = vibe_weight_multiplier
            group_vibes[v] = group_vibes.get(v, 0) + (w * v_mult)

    # Apply negative preferences
    negative_prefs = constraints.get('negative_preferences', [])
    group_cuisines = apply_negative_preferences(pooled_restaurants, negative_prefs, group_cuisines)

    # Compile absolute vetos across the entire group
    global_vetoes = set(constraints.get('vetoes', []))
    for vector in peer_vectors:
        for diet in vector.get('dietary', []):
            if diet.lower() != 'none':
                # e.g., If dietary is "Vegan", they veto "meat", "dairy", etc.
                # Simplified: Just enforce the tag matching or explicit veto logic
                if diet.lower() == 'vegan':
                    global_vetoes.update(['meat', 'beef', 'chicken', 'pork', 'dairy', 'seafood'])
                elif diet.lower() == 'halal':
                    global_vetoes.update(['pork', 'alcohol'])
                elif diet.lower() == 'no seafood':
                    global_vetoes.update(['seafood', 'fish', 'crab', 'shrimp', 'sushi'])

    best_score = -9999
    best_restaurant = None

    for name, r in pooled_restaurants.items():
        # Hard constraint: absolute group vetoes
        c_tags = [c.strip().lower() for c in r.get('cuisine', '').split(',')] if r.get('cuisine') else []
        if any(v.lower() in t for v in global_vetoes for t in c_tags):
            continue

        score = 0.0
        v_tags = [v.strip().lower() for v in r.get('vibe', '').split(',')] if r.get('vibe') else []

        for c in c_tags:
            score += group_cuisines.get(c, 0)

        for v in v_tags:
            base = group_vibes.get(v, 0) * 0.5
            if any(boost in v or v in boost for boost in vibe_boost):
                base *= vibe_weight_multiplier
            score += base

        score += r.get('_neg_score', 0)

        if score > best_score:
            best_score = score
            best_restaurant = r

    if not best_restaurant:
        return {"error": "No restaurants met the group constraints."}

    # Generate Reasoning String
    reasoning_parts = []
    r_cuisines = [c.strip().lower() for c in best_restaurant.get('cuisine', '').split(',')]
    expert_match = None
    for c in r_cuisines:
        if c in experts:
            expert_match = experts[c][0]
            expert_cuisine = c
            break

    if expert_match:
        reasoning_parts.append(f"Since {expert_match} is the group's resident expert on '{expert_cuisine}', their recommendation heavily influenced this decision.")

    reasoning_parts.append(f"'{best_restaurant['name']}' maximizes aggregate satisfaction across {len(peer_vectors)} Sovereign Agents.")

    if global_vetoes:
        reasoning_parts.append(f"It securely bypassed group vetoes: {', '.join(list(global_vetoes)[:3])}.")

    return {
        "best_option": best_restaurant,
        "score": round(best_score, 2),
        "reasoning": " ".join(reasoning_parts),
        "mood": constraints.get('mood', None),
    }

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided on stdin"}))
            sys.exit(1)

        payload = json.loads(input_data)
        host_restaurants = payload.get("host_restaurants", [])
        peer_vectors = payload.get("peer_vectors", [])
        constraints = payload.get("constraints", {})

        result = calculate_consensus(host_restaurants, peer_vectors, constraints)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
