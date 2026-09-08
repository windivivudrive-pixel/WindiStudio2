#!/usr/bin/env python3
"""Read-only GitHub repo metadata; no tokens required, no trend inference."""
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def normalize(value):
    value = value.removeprefix('https://github.com/').removesuffix('/').removesuffix('.git')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', value):
        raise argparse.ArgumentTypeError('Expected owner/repo or a GitHub repository URL')
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('repos', nargs='+', type=normalize)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = {'checked_at': datetime.now(timezone.utc).isoformat(),
              'trending_verified': False, 'repositories': []}
    failed = False
    for repo in dict.fromkeys(args.repos):
        url = f'https://api.github.com/repos/{repo}'
        request = Request(url, headers={'User-Agent': 'WindiStudio-repo-research',
                                       'Accept': 'application/vnd.github+json'})
        try:
            with urlopen(request, timeout=25) as response:
                data = json.load(response)
            result['repositories'].append({
                'repo': data['full_name'], 'url': data['html_url'],
                'api_source': url, 'description': data.get('description'),
                'stars': data['stargazers_count'], 'forks': data['forks_count'],
                'created_at': data['created_at'], 'pushed_at': data['pushed_at'],
                'archived': data['archived'], 'disabled': data['disabled'],
                'license': (data.get('license') or {}).get('spdx_id'),
                'language': data.get('language'), 'default_branch': data['default_branch'],
                'homepage': data.get('homepage'), 'topics': data.get('topics', []),
                'hot_evidence': None, 'demo_verified': False,
            })
        except (HTTPError, URLError, TimeoutError) as exc:
            failed = True
            result['repositories'].append({'repo': repo, 'error': str(exc), 'api_source': url})
            if isinstance(exc, HTTPError) and exc.code in (403, 429):
                result['stopped_reason'] = 'GitHub rate limit or access restriction; no automatic retry.'
                break
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Saved {len(result["repositories"])} repository records to {args.out.resolve()}')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
