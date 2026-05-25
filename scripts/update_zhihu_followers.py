#!/usr/bin/env python3
import re
import sys
import requests
from pathlib import Path

ZHIHU_COLUMN_URL = "https://zhuanlan.zhihu.com/c_2025369741573800586"
INDEX_HTML_PATH = Path(__file__).parent.parent / "index.html"

def get_follower_count():
    """获取知乎专栏订阅数"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    try:
        response = requests.get(ZHIHU_COLUMN_URL, headers=headers, timeout=10)
        response.raise_for_status()

        # 尝试从HTML中提取订阅数
        match = re.search(r'(\d+)\s*人关注', response.text)
        if match:
            return int(match.group(1))

        # 备用方案：查找JSON数据
        match = re.search(r'"followerCount":(\d+)', response.text)
        if match:
            return int(match.group(1))

        return None
    except Exception as e:
        print(f"获取订阅数失败: {e}", file=sys.stderr)
        return None

def update_html(follower_count):
    """更新index.html中的订阅数"""
    html_content = INDEX_HTML_PATH.read_text(encoding='utf-8')

    # 替换订阅数
    updated = re.sub(
        r'(<strong id="zhihu-followers">)[^<]*(</strong>)',
        rf'\g<1>{follower_count}\g<2>',
        html_content
    )

    if updated != html_content:
        INDEX_HTML_PATH.write_text(updated, encoding='utf-8')
        return True
    return False

if __name__ == "__main__":
    count = get_follower_count()
    if count is not None:
        if update_html(count):
            print(f"[OK] Follower count updated: {count}")
            sys.exit(0)
        else:
            print(f"[INFO] No change: {count}")
            sys.exit(1)
    else:
        print("[ERROR] Failed to fetch follower count")
        sys.exit(1)
