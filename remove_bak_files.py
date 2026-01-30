import os
import sys

# Remove all .bak files recursively from the current directory
def remove_bak_files(root_dir):
    removed = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.bak'):
                file_path = os.path.join(dirpath, filename)
                try:
                    os.remove(file_path)
                    removed.append(file_path)
                except Exception as e:
                    print(f"Failed to remove {file_path}: {e}")
    return removed

if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    removed_files = remove_bak_files(root)
    print(f"Removed {len(removed_files)} .bak files:")
    for f in removed_files:
        print(f)
