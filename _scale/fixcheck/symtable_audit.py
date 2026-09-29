"""Definitive free-variable audit using CPython's own symtable analysis.

Usage: python _scale/fixcheck/symtable_audit.py file1.py [file2.py ...]
Reports every name any scope references as a global that the module does not
bind and that is not a builtin.
"""
import builtins
import symtable
import sys


def audit(path):
    src = open(path, encoding="utf-8").read()
    top = symtable.symtable(src, path, "exec")
    module_names = {s.get_name() for s in top.get_symbols()}
    blt = set(dir(builtins))
    missing = {}

    def walk(table, path_stack):
        for sym in table.get_symbols():
            if sym.is_global():
                name = sym.get_name()
                if name not in module_names and name not in blt:
                    missing.setdefault(name, set()).add(table.get_name())
        for child in table.get_children():
            walk(child, path_stack + [child.get_name()])

    walk(top, [top.get_name()])
    if missing:
        print(f"== {path}: UNRESOLVED global refs ==")
        for name, scopes in sorted(missing.items()):
            print(f"  {name}  (scopes: {', '.join(sorted(scopes))})")
        return False
    print(f"== {path}: all global refs resolved ==")
    return True


if __name__ == "__main__":
    ok = all(audit(p) for p in sys.argv[1:])
    sys.exit(0 if ok else 1)
