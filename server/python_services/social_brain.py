import json
import sys
import math
from typing import List, Dict, Set

def extract_preferences(vault: dict) -> dict:
    """Extract weighted preferences from a vault."""
    prefs = {
        'cuisines': {},
        'vibes': {},
        'budgets': []
    }
    
    for r in vault.get('restaurants', []):
        weight = 2.0 if (r.get('visited') or (r.get('rating') and r.get('rating') >= 4)) else 1.0
        
        # Cuisines
        if r.get('cuisine') and r['cuisine'].lower() != 'unknown':
            tags = [c.strip().lower() for c in r['cuisine'].split(',')]
            for tag in tags:
                prefs['cuisines'][tag] = prefs['cuisines'].get(tag, 0) + weight
                
        # Vibes
        if r.get('vibe') and r['vibe'].lower() != 'unknown':
            tags = [v.strip().lower() for v in r['vibe'].split(',')]
            for tag in tags:
                prefs['vibes'][tag] = prefs['vibes'].get(tag, 0) + weight
                
        # Budget
        if r.get('budget'):
            try:
                prefs['budgets'].append(float(r['budget']))
            except ValueError:
                pass
                
    return prefs

def compute_jaccard(dict_a: dict, dict_b: dict) -> float:
    """Weighted Jaccard similarity for two dicts."""
    set_a = set(dict_a.keys())
    set_b = set(dict_b.keys())
    
    intersection = set_a.intersection(set_b)
    union = set_a.union(set_b)
    
    if not union:
        return 0.0
        
    num = sum(min(dict_a.get(k, 0), dict_b.get(k, 0)) for k in intersection)
    den = sum(max(dict_a.get(k, 0), dict_b.get(k, 0)) for k in union)
    
    return num / den if den > 0 else 0.0

def taste_alignment_score(vault_a: dict, vault_b: dict) -> float:
    prefs_a = extract_preferences(vault_a)
    prefs_b = extract_preferences(vault_b)
    
    c_score = compute_jaccard(prefs_a['cuisines'], prefs_b['cuisines'])
    v_score = compute_jaccard(prefs_a['vibes'], prefs_b['vibes'])
    
    return (c_score * 0.6) + (v_score * 0.4)

def identify_experts(group_vaults: dict) -> dict:
    """Identify 'contributors' who have abnormal density of a tag."""
    experts = {}
    for user, vault in group_vaults.items():
        prefs = extract_preferences(vault)
        total_cuisine_weight = sum(prefs['cuisines'].values())
        if total_cuisine_weight > 0:
            for c, w in prefs['cuisines'].items():
                if w / total_cuisine_weight >= 0.4: # 40% of their saves is this cuisine
                    experts.setdefault(c, []).append(user)
    return experts

def apply_negative_preferences(pooled_restaurants: dict, negative_prefs: list, group_cuisines: dict) -> dict:
    """Apply session-level penalties from negative feedback history."""
    for pref in negative_prefs:
        reason = pref.get('reason', '')
        cuisine = (pref.get('cuisine') or '').lower()
        name = (pref.get('restaurant_name') or '').lower()
        weight = pref.get('session_weight', -2.0)

        if reason == 'dislike_cuisine' and cuisine:
            # Heavy penalty on the entire cuisine group
            for c in list(group_cuisines.keys()):
                if cuisine in c or c in cuisine:
                    group_cuisines[c] = group_cuisines.get(c, 0) + weight * 2  # -4.0x

        if reason == 'too_expensive':
            # Mark restaurants with high budget as penalized
            for rname, r in pooled_restaurants.items():
                if r.get('budget') and float(r.get('budget', 0)) > 600:
                    r['_neg_score'] = r.get('_neg_score', 0) + weight

        # Directly penalize the specific vetoed restaurant
        if name and name in pooled_restaurants:
            pooled_restaurants[name]['_neg_score'] = pooled_restaurants[name].get('_neg_score', 0) + (weight * 3)

    return group_cuisines

def calculate_consensus(group_vaults: dict, constraints: dict) -> dict:
    """
    Find optimal restaurant from the pooled list.
    group_vaults = {"user1": vault_json, "user2": vault_json}
    constraints = {
        "vetoes": ["pizza"],
        "max_budget": 1000,
        "mood_overrides": { "vibe_boost": [...], "cuisine_weight": 1.0, "ignore_budget": false },
        "negative_preferences": [{ "reason": "too_expensive", "session_weight": -3.0 }]
    }
    """
    # Extract mood overrides
    mood = constraints.get('mood_overrides', {})
    vibe_boost = [v.lower() for v in mood.get('vibe_boost', [])]
    cuisine_boost = [c.lower() for c in mood.get('cuisine_boost', [])]
    cuisine_weight_multiplier = float(mood.get('cuisine_weight', 1.0))
    vibe_weight_multiplier = float(mood.get('vibe_weight', 1.0))
    ignore_budget = mood.get('ignore_budget', False)
    mood_max_budget = mood.get('max_budget', None)
    reasoning_prefix = constraints.get('reasoning_prefix', '')

    # Extract alignment adjustments (Phase 8 dynamic re-weighting)
    alignment_adjustments = {}
    for vault in group_vaults.values():
        adj = vault.get('analytics', {}).get('alignment_adjustments', {})
        for k, v in adj.items():
            alignment_adjustments[k] = min(alignment_adjustments.get(k, 1.0), float(v))

    pooled_restaurants = {}
    group_prefs = {}

    for user, vault in group_vaults.items():
        group_prefs[user] = extract_preferences(vault)
        for r in vault.get('restaurants', []):
            if r.get('name'):
                pooled_restaurants[r['name'].lower()] = r

    experts = identify_experts(group_vaults)

    # Build weighted group cuisine and vibe vectors
    group_cuisines = {}
    group_vibes = {}

    for user, prefs in group_prefs.items():
        for c, w in prefs['cuisines'].items():
            multiplier = 1.5 if user in experts.get(c, []) else 1.0

            if any(v.lower() in c for v in constraints.get('vetoes', [])):
                multiplier = -1.0

            # Apply mood cuisine boost
            if any(boost in c or c in boost for boost in cuisine_boost):
                multiplier *= 2.0

            # Apply dynamic re-weighting adjustment
            multiplier *= alignment_adjustments.get('cuisine_weight', 1.0)

            group_cuisines[c] = group_cuisines.get(c, 0) + (w * multiplier * cuisine_weight_multiplier)

        for v, w in prefs['vibes'].items():
            v_mult = 1.0
            # Apply mood vibe boost
            if any(boost in v or v in boost for boost in vibe_boost):
                v_mult = vibe_weight_multiplier

            group_vibes[v] = group_vibes.get(v, 0) + (w * v_mult)

    # Apply negative preferences as session penalties
    negative_prefs = constraints.get('negative_preferences', [])
    group_cuisines = apply_negative_preferences(pooled_restaurants, negative_prefs, group_cuisines)

    best_score = -9999
    best_restaurant = None

    for name, r in pooled_restaurants.items():
        # Hard constraint: absolute vetoes
        c_tags = [c.strip().lower() for c in r.get('cuisine', '').split(',')] if r.get('cuisine') else []
        if any(v.lower() in t for v in constraints.get('vetoes', []) for t in c_tags):
            continue

        # Budget constraint (respect mood override)
        if not ignore_budget:
            effective_max = mood_max_budget or constraints.get('max_budget')
            if effective_max and r.get('budget'):
                try:
                    if float(r['budget']) > float(effective_max):
                        continue
                except (ValueError, TypeError):
                    pass

        score = 0.0
        v_tags = [v.strip().lower() for v in r.get('vibe', '').split(',')] if r.get('vibe') else []

        for c in c_tags:
            score += group_cuisines.get(c, 0)

        for v in v_tags:
            base = group_vibes.get(v, 0) * 0.5
            # Extra boost for mood-matching vibes
            if any(boost in v or v in boost for boost in vibe_boost):
                base *= vibe_weight_multiplier
            score += base

        # Apply session-level negative score (from negative preferences)
        score += r.get('_neg_score', 0)

        if score > best_score:
            best_score = score
            best_restaurant = r

    if not best_restaurant:
        return {"error": "No restaurants met the group constraints."}

    # Generate Reasoning String
    reasoning_parts = []
    if reasoning_prefix:
        reasoning_parts.append(reasoning_prefix)

    r_cuisines = [c.strip().lower() for c in best_restaurant.get('cuisine', '').split(',')]
    expert_match = None
    for c in r_cuisines:
        if c in experts:
            expert_match = experts[c][0]
            expert_cuisine = c
            break

    if expert_match:
        reasoning_parts.append(f"Since {expert_match} is the group's resident expert on '{expert_cuisine}', their recommendation influenced this.")

    reasoning_parts.append(f"'{best_restaurant['name']}' maximizes aggregate satisfaction across the group's overlapping preferences.")

    if constraints.get('vetoes'):
        reasoning_parts.append(f"It successfully avoids the vetoed items: {', '.join(constraints['vetoes'])}.")

    if negative_prefs:
        reasoning_parts.append(f"Session preferences from {len(negative_prefs)} feedback signals were applied.")

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
        group_vaults = payload.get("vaults", {})
        constraints = payload.get("constraints", {})

        result = calculate_consensus(group_vaults, constraints)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
