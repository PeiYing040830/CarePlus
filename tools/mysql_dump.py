"""Read phpMyAdmin INSERT literals without executing SQL. No external packages."""
import re
from pathlib import Path

def load_dump(path):
    text = Path(path).read_text(encoding='utf-8-sig')
    tables = {}
    for match in re.finditer(r'INSERT INTO `(\w+)`\s*\(([^)]+)\)\s*VALUES\s*', text):
        name, columns = match[1], re.findall(r'`(\w+)`', match[2])
        pos = match.end()
        rows = []
        while True:
            while text[pos].isspace() or text[pos] == ',': pos += 1
            if text[pos] == ';': break
            if text[pos] != '(': raise ValueError(f'Unexpected INSERT syntax in {name}')
            pos += 1
            values = []
            while True:
                while text[pos].isspace(): pos += 1
                if text[pos] == "'":
                    pos += 1
                    chars = []
                    while True:
                        char = text[pos]; pos += 1
                        if char == '\\':
                            escaped = text[pos]; pos += 1
                            chars.append({'n':'\n','r':'\r','t':'\t','0':'\0','Z':'\x1a'}.get(escaped,escaped))
                        elif char == "'":
                            if text[pos] == "'": chars.append("'"); pos += 1
                            else: break
                        else: chars.append(char)
                    value = ''.join(chars)
                else:
                    end = pos
                    while text[end] not in ',)': end += 1
                    token = text[pos:end].strip(); pos = end
                    if token.upper() == 'NULL': value = None
                    elif re.fullmatch(r'-?\d+',token): value = int(token)
                    elif re.fullmatch(r'-?\d+\.\d+',token): value = token
                    else: raise ValueError(f'Unsupported SQL value in {name}')
                values.append(value)
                while text[pos].isspace(): pos += 1
                if text[pos] == ')': pos += 1; break
                if text[pos] != ',': raise ValueError(f'Invalid column separator in {name}')
                pos += 1
            if len(values) != len(columns): raise ValueError(f'Column count mismatch in {name}')
            rows.append(dict(zip(columns, values)))
        tables.setdefault(name, []).extend(rows)
    return tables

if __name__ == '__main__':
    import sys
    for name, rows in load_dump(sys.argv[1]).items(): print(name, len(rows))
