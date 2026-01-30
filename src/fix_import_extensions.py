import os
import re
import shutil

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".json", ".mjs"]

IMPORT_RE = re.compile(
    r"""(import\s+[\w*\s{},]*\s*from\s*['\"](?P<path1>\.[^'\"]+)['\"]|require\(\s*['\"](?P<path2>\.[^'\"]+)['\"]\s*\))"""
)

def find_actual_file(base_path):
    for ext in EXTENSIONS:
        candidate = base_path + ext
        if os.path.isfile(candidate):
            return ext
    return None

def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False
    def replacer(match):
        path = match.group("path1") or match.group("path2")
        if os.path.splitext(path)[1]:  # already has extension
            return match.group(0)
        abs_base = os.path.normpath(os.path.join(os.path.dirname(filepath), path))
        ext = find_actual_file(abs_base)
        if ext:
            changed_path = path + ext
            changed_str = match.group(0).replace(path, changed_path)
            nonlocal changed
            changed = True
            print(f"Fixed: {filepath}  {changed_path}")
            return changed_str
        return match.group(0)

    new_content = IMPORT_RE.sub(replacer, content)
    if changed:
        shutil.copy2(filepath, filepath + ".bak")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)

def main():
    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith((".js", ".jsx", ".ts", ".tsx", ".mjs")):
                fix_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
