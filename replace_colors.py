import os
import re
from pathlib import Path

COLOR_MAP = {
    'faf8ff': 'blue-50',
    'f2f3ff': 'blue-50',
    'dae2fd': 'blue-100',
    'e2e7ff': 'blue-100',
    'd0e1fb': 'blue-200',
    'c5c5d3': 'blue-200',
    '00236f': 'blue-600',
    '1e3a8a': 'blue-700',
    '131b2e': 'slate-900',
    '444651': 'slate-600',
    '505f76': 'slate-500',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    def replacer(match):
        prefix = match.group(1)
        hex_code = match.group(2).lower()
        if hex_code in COLOR_MAP:
            return f"{prefix}-{COLOR_MAP[hex_code]}"
        return match.group(0)

    # Need to match simple prefixes and also group prefixes like group-hover:bg-[#hex]
    pattern = r'\b([a-zA-Z0-9:-]+)-\[#([0-9a-fA-F]{6})\]'
    
    content = re.sub(pattern, replacer, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    src_dir = Path('frontend/src')
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
