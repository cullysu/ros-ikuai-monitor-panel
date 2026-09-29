import ast
import builtins


def analyze(path, class_names):
    src = open(path, encoding="utf-8").read()
    tree = ast.parse(src)

    module_bindings = set()
    binding_location = {}
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            module_bindings.add(node.name)
            binding_location[node.name] = f"def@{node.lineno}"
        elif isinstance(node, ast.Import):
            for a in node.names:
                name = a.asname or a.name.split(".")[0]
                module_bindings.add(name)
                binding_location[name] = f"import@{node.lineno}"
        elif isinstance(node, ast.ImportFrom):
            for a in node.names:
                name = a.asname or a.name
                module_bindings.add(name)
                binding_location[name] = f"from@{node.lineno}"
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                for n in ast.walk(t):
                    if isinstance(n, ast.Name):
                        module_bindings.add(n.id)
                        binding_location[n.id] = f"assign@{node.lineno}"
        elif isinstance(node, ast.AnnAssign):
            if isinstance(node.target, ast.Name):
                module_bindings.add(node.target.id)
                binding_location[node.target.id] = f"assign@{node.lineno}"

    blt = set(dir(builtins))

    class Scope:
        def __init__(self, name):
            self.name = name
            self.bound = set()
            self.loaded = set()
            self.children = []

    def collect_target_names(target, bound):
        for n in ast.walk(target):
            if isinstance(n, ast.Name):
                bound.add(n.id)
            elif isinstance(n, (ast.Tuple, ast.List)):
                for e in n.elts:
                    collect_target_names(e, bound)

    def analyze(node, scope, in_class_body=False):
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                scope.loaded.add(child.name)  # name lookup at def time (decorator target)
                inner = Scope(child.name)
                scope.children.append(inner)
                a = child.args
                for arg in list(a.posonlyargs) + list(a.args) + list(a.kwonlyargs):
                    inner.bound.add(arg.arg)
                if a.vararg:
                    inner.bound.add(a.vararg.arg)
                if a.kwarg:
                    inner.bound.add(a.kwarg.arg)
                for d in list(a.defaults) + [d for d in a.kw_defaults if d is not None]:
                    mark_loads(d, scope)
                for d in child.decorator_list:
                    mark_loads(d, scope)
                for ann in (
                    [a.vararg.annotation if a.vararg else None]
                    + [a.kwarg.annotation if a.kwarg else None]
                    + [arg.annotation for arg in list(a.posonlyargs) + list(a.args) + list(a.kwonlyargs)]
                    + [child.returns]
                ):
                    if ann is not None:
                        mark_loads(ann, scope)
                for s in child.body:
                    analyze(s, inner)
            elif isinstance(child, ast.Lambda):
                inner = Scope("<lambda>")
                scope.children.append(inner)
                a = child.args
                for arg in list(a.posonlyargs) + list(a.args) + list(a.kwonlyargs):
                    inner.bound.add(arg.arg)
                if a.vararg:
                    inner.bound.add(a.vararg.arg)
                if a.kwarg:
                    inner.bound.add(a.kwarg.arg)
                for d in list(a.defaults) + [d for d in a.kw_defaults if d is not None]:
                    mark_loads(d, scope)
                mark_loads(child.body, inner)
            elif isinstance(child, ast.ClassDef):
                for d in child.decorator_list + child.bases:
                    mark_loads(d, scope)
                for kw in child.keywords:
                    mark_loads(kw.value, scope)
                inner = Scope(child.name)
                scope.children.append(inner)
                for s in child.body:
                    analyze(s, inner, in_class_body=True)
            elif isinstance(child, (ast.Import, ast.ImportFrom)):
                for a in child.names:
                    scope.bound.add(a.asname or a.name.split(".")[0])
            elif isinstance(child, ast.Assign):
                mark_loads(child.value, scope)
                for t in child.targets:
                    collect_target_names(t, scope.bound)
            elif isinstance(child, ast.AnnAssign):
                if child.value is not None:
                    mark_loads(child.value, scope)
                collect_target_names(child.target, scope.bound)
            elif isinstance(child, ast.AugAssign):
                collect_target_names(child.target, scope.bound)
                if isinstance(child.target, ast.Name):
                    scope.loaded.add(child.target.id)
                mark_loads(child.value, scope)
            elif isinstance(child, ast.NamedExpr):
                collect_target_names(child.target, scope.bound)
                mark_loads(child.value, scope)
            elif isinstance(child, (ast.For, ast.AsyncFor)):
                mark_loads(child.iter, scope)
                collect_target_names(child.target, scope.bound)
                for s in child.body + child.orelse:
                    analyze(s, scope)
            elif isinstance(child, ast.comprehension):
                mark_loads(child.iter, scope)
                collect_target_names(child.target, scope.bound)
                for cond in child.ifs:
                    mark_loads(cond, scope)
            elif isinstance(child, (ast.With, ast.AsyncWith)):
                for item in child.items:
                    mark_loads(item.context_expr, scope)
                    if item.optional_vars is not None:
                        collect_target_names(item.optional_vars, scope.bound)
                for s in child.body:
                    analyze(s, scope)
            elif isinstance(child, ast.Global):
                for nm in child.names:
                    scope.bound.add(nm)
                    scope.loaded.add(nm)
            elif isinstance(child, ast.Name):
                if isinstance(child.ctx, (ast.Load, ast.Del)):
                    scope.loaded.add(child.id)
                elif isinstance(child.ctx, ast.Store):
                    scope.bound.add(child.id)
            else:
                analyze(child, scope)

    def mark_loads(expr, scope):
        if expr is None:
            return
        for n in ast.walk(expr):
            if isinstance(n, ast.Name) and isinstance(n.ctx, (ast.Load, ast.Del)):
                scope.loaded.add(n.id)

    for cls_name in class_names:
        cls = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == cls_name)
        scope = Scope(cls_name)
        for stmt in cls.body:
            analyze(stmt, scope, in_class_body=True)
        all_bound = set(scope.bound)
        for c in scope.children:
            all_bound |= c.bound
        free = scope.loaded - all_bound
        refs = sorted(n for n in free if n in module_bindings)
        unknown = sorted(n for n in free if n not in module_bindings and n not in blt)
        print(f"=== {cls_name}: free refs to module-level names ({len(refs)}) ===")
        print("\n".join(f"  {n}  [{binding_location[n]}]" for n in refs))
        print(f"--- unresolved non-builtin free names ({len(unknown)}) ---")
        print(", ".join(unknown))
        print()


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "app.py"
    names = sys.argv[2:] or ["Collector", "Handler"]
    analyze(path, names)
