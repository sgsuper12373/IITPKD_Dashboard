import re
import os

def main():
    try:
        with open('lint_output.txt', 'r', encoding='utf-16') as f:
            lines = f.readlines()
    except Exception as e:
        print("Could not read as utf-16, trying utf-8:", e)
        try:
            with open('lint_output.txt', 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except:
            print("Failed to read entirely")
            return

    current_file = None
    for line in lines:
        line = line.strip()
        if line.startswith('D:\\') or line.startswith('d:\\'):
            current_file = line
            print("Found file:", current_file)
        elif 'isRole0\' is not defined' in line:
            match = re.search(r'^(\d+):', line)
            if match and current_file:
                line_num = int(match.group(1)) - 1
                try:
                    with open(current_file, 'r', encoding='utf-8') as f:
                        file_lines = f.readlines()
                    
                    if '{!isRole0 && (' in file_lines[line_num]:
                        file_lines[line_num] = file_lines[line_num].replace('{!isRole0 && (', '{true && (')
                        print(f"Fixed line {line_num+1} in {current_file}")
                    elif '<>{!isRole0 && (' in file_lines[line_num]:
                        file_lines[line_num] = file_lines[line_num].replace('<>{!isRole0 && (', '<>{true && (')
                        print(f"Fixed line {line_num+1} in {current_file}")
                    else:
                        # Just replace isRole0 with false
                        file_lines[line_num] = file_lines[line_num].replace('isRole0', 'false')
                        print(f"Fixed line {line_num+1} in {current_file} (fallback)")
                        
                    with open(current_file, 'w', encoding='utf-8') as f:
                        f.writelines(file_lines)
                except Exception as e:
                    print(f"Error processing {current_file}: {e}")

main()
print("Done!")
