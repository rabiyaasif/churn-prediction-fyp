import joblib
import inspect
import numpy as np

PATH = "models/pipeline.pkl"  # keep relative to churn-backend folder

def try_print(msg, val=None):
    print(f"\n=== {msg} ===")
    if val is not None:
        try:
            print(val)
        except Exception as e:
            print(f"<could not print value: {e}>")

def expand_column_transformer(ct):
    """
    Try to extract feature names from a ColumnTransformer-like object.
    Returns list or raises.
    """
    names = []
    # sklearn >=1.0 has get_feature_names_out for ColumnTransformer
    if hasattr(ct, "get_feature_names_out"):
        return list(ct.get_feature_names_out())
    # older sklearn: inspect transformers_ attribute
    if hasattr(ct, "transformers_"):
        for name, trans, cols in ct.transformers_:
            if name == "remainder" and trans == "drop":
                continue
            if trans == "drop":
                continue
            if trans == "passthrough":
                # cols could be slice/array/list
                if hasattr(cols, "__iter__"):
                    names.extend(list(cols))
                else:
                    names.append(str(cols))
                continue
            # try to get feature names out from the transformer
            try:
                if hasattr(trans, "get_feature_names_out"):
                    out = list(trans.get_feature_names_out(cols if cols is not None else None))
                elif hasattr(trans, "get_feature_names"):
                    out = list(trans.get_feature_names(cols if cols is not None else None))
                else:
                    # fallback: use column names (cols)
                    if hasattr(cols, "__iter__"):
                        out = list(cols)
                    else:
                        out = [str(cols)]
                names.extend(out)
            except Exception:
                # last resort: add raw column names
                if hasattr(cols, "__iter__"):
                    names.extend(list(cols))
                else:
                    names.append(str(cols))
        return names
    raise RuntimeError("Cannot expand ColumnTransformer: unsupported object structure")

def main():
    try:
        pipeline = joblib.load(PATH)
    except FileNotFoundError:
        print(f"Pipeline file not found at {PATH}. Check path and try again.")
        return
    except Exception as e:
        print(f"Failed to load pipeline.pkl: {e}")
        return

    try_print("Pipeline object (repr)", repr(pipeline))
    try_print("Pipeline type", type(pipeline))
    # show named steps if available
    if hasattr(pipeline, "named_steps"):
        try_print("Pipeline named_steps keys", list(pipeline.named_steps.keys()))
    else:
        try_print("Pipeline has no named_steps attribute", hasattr(pipeline, "named_steps"))

    # Try to find the preprocessor inside pipeline:
    preproc = None
    if hasattr(pipeline, "named_steps"):
        for name, comp in pipeline.named_steps.items():
            # Heuristic: preprocessor often named "preprocessor" or "transformer"
            if name.lower().startswith("preproc") or "preproc" in name.lower() or "transform" in name.lower() or name.lower().startswith("col"):
                preproc = comp
                try_print(f"Selected preprocessor candidate (named '{name}')", type(comp))
                break
        # fallback: first step if none matches heuristic
        if preproc is None:
            first_name = list(pipeline.named_steps.keys())[0]
            preproc = pipeline.named_steps[first_name]
            try_print(f"No clear preprocessor name found — using first step '{first_name}'", type(preproc))

    else:
        # pipeline is not a sklearn Pipeline? try to use as-is
        preproc = pipeline
        try_print("Using pipeline object itself as preprocessor candidate", type(preproc))

    # Inspect the preprocessor candidate
    try_print("Dir(preprocessor) (short)", [a for a in dir(preproc) if not a.startswith("_")][:100])
    # Try common attributes
    if hasattr(preproc, "get_feature_names_out"):
        try:
            names = list(preproc.get_feature_names_out())
            try_print("Feature names from get_feature_names_out()", names)
            return
        except Exception as e:
            try_print("get_feature_names_out() failed", e)

    # Some preprocessors expose feature_names_in_
    if hasattr(preproc, "feature_names_in_"):
        try_print("feature_names_in_ attribute", list(getattr(preproc, "feature_names_in_")))
        # continue — feature_names_in_ are input column names (before expansion)

    # If preproc looks like a ColumnTransformer (has transformers_ attr), try to expand
    if hasattr(preproc, "transformers_") or "ColumnTransformer" in type(preproc).__name__:
        try:
            names = expand_column_transformer(preproc)
            try_print("Feature names expanded from ColumnTransformer/transformers_", names)
            return
        except Exception as e:
            try_print("Failed to expand ColumnTransformer", e)

    # If preproc contains steps (like a Pipeline), try to dive into it
    if hasattr(preproc, "steps"):
        try_print("Preprocessor appears to be a Pipeline. Steps:", [n for n, _ in getattr(preproc, "steps")])
        # attempt to find a ColumnTransformer inside its steps
        for n, step in getattr(preproc, "steps"):
            if hasattr(step, "transformers_") or "ColumnTransformer" in type(step).__name__:
                try:
                    names = expand_column_transformer(step)
                    try_print(f"Feature names from step '{n}'", names)
                    return
                except Exception as e:
                    try_print(f"Failed expanding step '{n}'", e)

    # Last resorts: try pipeline.feature_names_in_ or pipeline.named_steps['model'].booster feature names
    if hasattr(pipeline, "feature_names_in_"):
        try_print("pipeline.feature_names_in_", list(pipeline.feature_names_in_))
        return

    # Try to inspect final estimator's expected features (if scikit-learn wrapper)
    final_est = None
    if hasattr(pipeline, "named_steps") and list(pipeline.named_steps.keys()):
        # commonly the final step is named 'model' or last key
        last_key = list(pipeline.named_steps.keys())[-1]
        final_est = pipeline.named_steps[last_key]
        try_print("Final estimator candidate", type(final_est))
        # XGBClassifier (scikit-learn wrapper) may expose feature_names_in_
        if hasattr(final_est, "feature_names_in_"):
            try_print("final_est.feature_names_in_", list(getattr(final_est, "feature_names_in_")))
            return
        # raw xgboost.Booster won't have names easily
        if hasattr(final_est, "get_booster") or "XGB" in type(final_est).__name__:
            try_print("Final estimator appears XGBoost-like", type(final_est))
            # try to get feature names via booster if available
            try:
                booster = final_est.get_booster() if hasattr(final_est, "get_booster") else None
                if booster and hasattr(booster, "feature_names"):
                    try_print("booster.feature_names", booster.feature_names)
                    return
            except Exception as e:
                try_print("Could not inspect booster", e)

    print("\nNo feature list could be inferred automatically. See diagnostics above.")
    print("If you still do not see feature names, tell me the printed output and I will interpret it.")
    print("Possible next steps: inspect the training script that created the pipeline, or share the pipeline.named_steps keys printed above.")

if __name__ == "__main__":
    main()
