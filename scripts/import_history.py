"""
13 Run League — Historical Data Importer

Two sheet formats supported:
  2018-2019: Name(0) | Team(1) | Paid(2) | Owe(3) | Method(4) | Times(5) | Total(6) | weeks from col 7
  2020+:     #(0) | Name(1) | Team(2) | Paid(3) | Owe(4) | Method(5) | Times(6) | Total(7) | weeks from col 9

Usage: python3 import_history.py
Place CSVs named by year (2018.csv, 2019.csv ...) in same folder.
Rollover weeks should have blank cells.
"""

import csv, json, os, re, glob
from datetime import datetime

OUTPUT_FILE = "history_import.json"

# Name normalization — add entries here when names change across years
NAME_MAP = {
    # Bova family
    'Bova': 'Jonathan Bova',
    'Jon Bova': 'Jonathan Bova',
    # Colby
    'Colby': 'Colby Black',
    # Cliff
    'Cliff': 'Cliff Lungaretti',
    # Dave
    'Dave (NCD)': 'New Cleveland Dave',
    # Erick
    'Erick': 'Erick Browning',
    # Brian Devine
    'Devine': 'Brian Devine',
    # Dianne
    'Dianne (CL Mom)': 'Dianne',
    # Asa
    'Asa Pogrelis (TJ)': 'Asa Pogrelis',
    # Matt (2018 only)
    'Matt': 'Matt Pariseau',
    # Katie (2018 only)
    'Katie': 'Katie Pariseau',
    # JFC Julian
    'JFC - Julian': 'JFC',
    # Brad
    'Brad': 'Brad Brown',
    # Schmitt and Klein variants
    'Michael Schmitt & Ben Klein': 'the Schmitt/Klein Consortium',
    'Schmitt & Klein': 'the Schmitt/Klein Consortium',
    # Katie P
    'Katie P': 'Katie Pariseau',
    # Harms
    'Harms': 'Emily Harms',
    # Matt P
    'Matt P': 'Matt Pariseau',
}

# Players to force-mark as active even if not in most recent year's CSV
FORCE_ACTIVE = {'Brad Brown'}

def is_numeric(val):
    try:
        float(str(val).replace(',','').replace('$','').strip())
        return True
    except ValueError:
        return False

def parse_amount(val):
    try:
        return int(float(str(val).replace(',','').replace('$','').strip()))
    except ValueError:
        return 0

def normalize_name(name):
    return NAME_MAP.get(name, name)

def detect_format(rows):
    for row in rows:
        if len(row) < 3:
            continue
        col0 = str(row[0]).strip()
        col1 = str(row[1]).strip()
        col2 = str(row[2]).strip()
        if col0.isdigit() and int(col0) <= 30 and col1 and col2:
            return 1, 2, 9
    return 0, 1, 7

def is_member_row(name, team):
    skip_exact = {'name','total','pot','week','carryover','carry','times',''}
    skip_contains = ['total','carryover','carry','pot won','times']
    if not name or not team:
        return False
    if name.lower() in skip_exact or team.lower() in skip_exact:
        return False
    if any(kw in name.lower() for kw in skip_contains):
        return False
    if any(kw in team.lower() for kw in skip_contains):
        return False
    return True

def parse_csv(filepath, year):
    with open(filepath, newline='', encoding='utf-8-sig') as f:
        rows = list(csv.reader(f))

    name_col, team_col, weeks_start_col = detect_format(rows)

    date_ranges_row = None
    pot_row = None
    for i, row in enumerate(rows):
        joined = ' '.join(str(c) for c in row)
        if 'Pot' in joined and 'Won' in joined:
            pot_row = i
        if date_ranges_row is None:
            for cell in row[weeks_start_col:]:
                if re.match(r'^\d+/\d+', str(cell).strip()):
                    date_ranges_row = i
                    break

    weeks = []
    if date_ranges_row is not None:
        date_row = rows[date_ranges_row]
        for col_idx in range(weeks_start_col, len(date_row)):
            date_str = str(date_row[col_idx]).strip()
            if date_str and re.match(r'\d+/\d+', date_str):
                weeks.append({'week_num': len(weeks)+1, 'col_idx': col_idx,
                               'date_range': date_str, 'year': year})

    pot_by_week = {}
    if pot_row is not None:
        pot_data = rows[pot_row]
        for week in weeks:
            col = week['col_idx']
            pot_by_week[week['week_num']] = parse_amount(pot_data[col]) if col < len(pot_data) else 0

    members = []
    for i, row in enumerate(rows):
        if len(row) <= team_col or i == pot_row:
            continue
        name = normalize_name(str(row[name_col]).strip())
        team = str(row[team_col]).strip()
        if not is_member_row(name, team):
            continue

        paid_col = team_col + 1
        owe_col  = team_col + 2
        meth_col = team_col + 3
        paid_in = parse_amount(row[paid_col]) if len(row) > paid_col and is_numeric(row[paid_col]) else 0
        owes    = parse_amount(row[owe_col])  if len(row) > owe_col  and is_numeric(row[owe_col])  else 0
        method  = str(row[meth_col]).strip()  if len(row) > meth_col else ''

        week_wins = set()
        for week in weeks:
            col = week['col_idx']
            if col < len(row):
                cell = str(row[col]).strip()
                if is_numeric(cell) and parse_amount(cell) > 0:
                    week_wins.add(week['week_num'])

        members.append({
            'name': name, 'team': team, 'year': year,
            'paid_in': paid_in, 'owes': owes, 'payment_method': method,
            'week_wins': list(week_wins), 'total_won': 0
        })

    league_results = []
    for week in weeks:
        wn  = week['week_num']
        pot = pot_by_week.get(wn, 0)
        winners = [{'name': m['name'], 'team': m['team'], 'amount': 0}
                   for m in members if wn in m['week_wins']]
        is_rollover  = len(winners) == 0
        total_shares = len(winners)
        share_value  = round(pot / total_shares) if total_shares > 0 else 0
        for w in winners:
            w['amount'] = share_value
        league_results.append({
            'week_num': wn, 'date_range': week['date_range'], 'year': year,
            'pot': pot, 'is_rollover': is_rollover,
            'total_shares': total_shares, 'share_value': share_value, 'winners': winners
        })

    for member in members:
        member['total_won'] = sum(
            w['amount'] for result in league_results
            for w in result['winners']
            if w['name'] == member['name'] and w['team'] == member['team']
        )

    return {'year': year, 'weeks': weeks, 'members': members, 'league_results': league_results}

def build_rankings(all_data):
    most_recent_year = max(d['year'] for d in all_data)
    active_names = {m['name'] for d in all_data if d['year'] == most_recent_year for m in d['members']}
    active_names |= FORCE_ACTIVE

    player_stats = {}
    for data in all_data:
        for member in data['members']:
            name = member['name']
            if name not in player_stats:
                player_stats[name] = {'name': name, 'years_played': [], 'teams': [],
                    'total_won': 0, 'total_shares': 0, 'is_active': name in active_names}
            player_stats[name]['years_played'].append(data['year'])
            player_stats[name]['teams'].append({'year': data['year'], 'team': member['team']})
            player_stats[name]['total_won'] += member['total_won']
            for result in data['league_results']:
                for winner in result['winners']:
                    if winner['name'] == name:
                        player_stats[name]['total_shares'] += 1

    all_time = sorted(player_stats.values(), key=lambda p: p['total_won'], reverse=True)
    active   = sorted([p for p in player_stats.values() if p['is_active']],
                      key=lambda p: p['total_won'], reverse=True)

    team_stats = {}
    for data in all_data:
        for result in data['league_results']:
            if not result['is_rollover']:
                for winner in result['winners']:
                    t = winner['team']
                    if t not in team_stats:
                        team_stats[t] = {'team': t, 'thirteen_run_weeks': 0,
                                         'total_paid_out': 0, 'years_won': []}
                    team_stats[t]['thirteen_run_weeks'] += 1
                    team_stats[t]['total_paid_out'] += winner['amount']
                    if data['year'] not in team_stats[t]['years_won']:
                        team_stats[t]['years_won'].append(data['year'])

    teams_ranked = sorted(team_stats.values(), key=lambda t: t['thirteen_run_weeks'], reverse=True)
    return {'all_time': all_time, 'active': active, 'teams': teams_ranked}

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_files = {
        int(os.path.splitext(os.path.basename(f))[0]): f
        for f in glob.glob(os.path.join(script_dir, "*.csv"))
        if re.match(r'^\d{4}\.csv$', os.path.basename(f))
    }

    if not csv_files:
        print("❌ No year-named CSVs found (e.g. 2018.csv, 2019.csv)")
        return

    print(f"📂 Found {len(csv_files)} CSV(s): {sorted(csv_files.keys())}\n")

    all_data, summary = [], []
    prev_ending = 0

    for year, filename in sorted(csv_files.items()):
        print(f"📂 Processing {year}...")
        data = parse_csv(filename, year)
        all_data.append(data)

        rollover_weeks = sum(1 for r in data['league_results'] if r['is_rollover'])
        winning_weeks  = sum(1 for r in data['league_results'] if not r['is_rollover'])
        biggest_pot    = max((r['pot'] for r in data['league_results']), default=0)
        biggest_winner = max(data['members'], key=lambda m: m['total_won'], default=None)
        last_week      = data['league_results'][-1] if data['league_results'] else None
        ending_pot     = last_week['pot'] if last_week and last_week['is_rollover'] else 0

        if prev_ending:
            print(f"   💸 Started with ${prev_ending} rollover from {year-1}")
        print(f"   ✅ {len(data['members'])} members, {len(data['weeks'])} weeks")
        print(f"   🏆 {winning_weeks} winning, {rollover_weeks} rollovers, biggest pot ${biggest_pot}")
        if ending_pot:
            print(f"   ➡️  ${ending_pot} rolls into {year+1}")
        else:
            print(f"   ✅ Season ended clean — no rollover")
        if biggest_winner:
            print(f"   🥇 {biggest_winner['name']} ({biggest_winner['team']}) — ${biggest_winner['total_won']}")

        summary.append({
            'year': year, 'members': len(data['members']), 'weeks': len(data['weeks']),
            'winning_weeks': winning_weeks, 'rollover_weeks': rollover_weeks,
            'biggest_pot': biggest_pot, 'carried_rollover_from_prev_year': prev_ending,
            'has_carried_rollover': prev_ending > 0, 'ending_pot_carried_to_next': ending_pot,
            'top_winner': biggest_winner['name'] if biggest_winner else None,
            'top_winner_team': biggest_winner['team'] if biggest_winner else None,
            'top_winner_amount': biggest_winner['total_won'] if biggest_winner else 0
        })
        prev_ending = ending_pot

    print(f"\n🔄 Building rankings...")
    rankings = build_rankings(all_data)

    print(f"\n🏅 All-time top 10:")
    for i, p in enumerate(rankings['all_time'][:10], 1):
        flag = "⭐" if p['is_active'] else ""
        print(f"   {i}. {p['name']} {flag}— ${p['total_won']} ({p['total_shares']} shares, {len(p['years_played'])} yrs)")

    print(f"\n🏅 Active top 10:")
    for i, p in enumerate(rankings['active'][:10], 1):
        print(f"   {i}. {p['name']} — ${p['total_won']} ({p['total_shares']} shares)")

    print(f"\n⚾ Top 10 teams by 13-run weeks in league history:")
    for i, t in enumerate(rankings['teams'][:10], 1):
        print(f"   {i}. {t['team']} — {t['thirteen_run_weeks']} times, ${t['total_paid_out']} paid out")

    output = {
        '_meta': {'description': '13 Run League — South Brooklyn historical data',
                  'generated': datetime.now().isoformat(),
                  'years': sorted(csv_files.keys()), 'summary': summary},
        'data': all_data, 'rankings': rankings
    }

    with open(os.path.join(script_dir, OUTPUT_FILE), 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✅ Done! Written to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
