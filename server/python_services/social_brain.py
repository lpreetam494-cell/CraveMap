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

def calculate_consensus(group_vaults: dict, constraints: dict) -> dict:
    """
    Find optimal restaurant from the pooled list.
    group_vaults = {"user1": vault_json, "user2": vault_json}
    constraints = {"vetoes": ["pizza", "seafood"], "max_budget": 1000}
    """
    pooled_restaurants = {}
    group_prefs = {}
    
    for user, vault in group_vaults.items():
        group_prefs[user] = extract_preferences(vault)
        for r in vault.get('restaurants', []):
            pooled_restaurants[r['name'].lower()] = r
            
    experts = identify_experts(group_vaults)
    
    # Calculate group intersection vector (common ground)
    group_cuisines = {}
    group_vibes = {}
    
    for user, prefs in group_prefs.items():
        for c, w in prefs['cuisines'].items():
            # Expert influence
            multiplier = 1.5 if user in experts.get(c, []) else 1.0
            
            # Penalties
            if any(v.lower() in c for v in constraints.get('vetoes', [])):
                multiplier = -1.0 # Heavy penalty
                
            group_cuisines[c] = group_cuisines.get(c, 0) + (w * multiplier)
            
        for v, w in prefs['vibes'].items():
            group_vibes[v] = group_vibes.get(v, 0) + w

    best_score = -9999
    best_restaurant = None
    
    for name, r in pooled_restaurants.items():
        # Hard constraint checks
        if constraints.get('max_budget') and r.get('budget'):
            if float(r['budget']) > constraints['max_budget']:
                continue
                
        score = 0.0
        
        c_tags = [c.strip().lower() for c in r.get('cuisine', '').split(',')] if r.get('cuisine') else []
        v_tags = [v.strip().lower() for v in r.get('vibe', '').split(',')] if r.get('vibe') else []
        
        # If restaurant cuisine is penalized, drop heavily
        if any(v.lower() in t for v in constraints.get('vetoes', []) for t in c_tags):
            continue # Hard veto block
            
        for c in c_tags:
            score += group_cuisines.get(c, 0)
            
        for v in v_tags:
            score += group_vibes.get(v, 0) * 0.5 # Vibes are secondary to cuisine
            
        if score > best_score:
            best_score = score
            best_restaurant = r
            
    if not best_restaurant:
        return {"error": "No restaurants met the group constraints."}
        
    # Generate Reasoning String
    reasoning = []
    r_cuisines = [c.strip().lower() for c in best_restaurant.get('cuisine', '').split(',')]
    
    expert_match = None
    for c in r_cuisines:
        if c in experts:
            expert_match = experts[c][0]
            expert_cuisine = c
            break
            
    if expert_match:
        reasoning.append(f"Since {expert_match} is the group's resident expert on '{expert_cuisine}' cuisine, their recommendation heavily influenced this.")
    
    reasoning.append(f"'{best_restaurant['name']}' maximizes aggregate satisfaction across the group's overlapping preferences.")
    
    if constraints.get('vetoes'):
        reasoning.append(f"It successfully avoids the vetoed items: {', '.join(constraints['vetoes'])}.")
        
    return {
        "best_option": best_restaurant,
        "score": round(best_score, 2),
        "reasoning": " ".join(reasoning)
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
