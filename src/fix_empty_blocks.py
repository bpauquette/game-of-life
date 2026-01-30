import re

def fix_empty_blocks(js_code):
    # Replace empty catch blocks: catch (e) {}
    js_code = re.sub(
        r'catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{\s*\}',
        lambda m: f'catch ({m.group(1)}) {{ console.error({m.group(1)}); }}',
        js_code
    )
    # Replace empty finally blocks: finally {}
    js_code = re.sub(
        r'finally\s*\{\s*\}',
        'finally { /* intentionally left blank */ }',
        js_code
    )
    # Replace empty else blocks: else {}
    js_code = re.sub(
        r'else\s*\{\s*\}',
        'else { /* intentionally left blank */ }',
        js_code
    )
    return js_code

if __name__ == "__main__":
    input_path = "view/GameOfLifeApp.js"
    backup_path = "view/GameOfLifeApp.js.bak"

    import shutil
    shutil.copy2(input_path, backup_path)

    with open(input_path, "r", encoding="utf-8") as f:
        code = f.read()

    fixed_code = fix_empty_blocks(code)

    with open(input_path, "w", encoding="utf-8") as f:
        f.write(fixed_code)

    print(f"Backup saved as {backup_path}")
    print(f"Fixed file written in place: {input_path}")
