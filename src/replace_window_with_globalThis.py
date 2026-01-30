import os

def replace_window_with_globalThis(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.js'):
                file_path = os.path.join(dirpath, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                new_content = content.replace('window', 'globalThis')
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Replaced in: {file_path}")

if __name__ == "__main__":
    replace_window_with_globalThis(".")
