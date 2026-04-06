import modal

app = modal.App("clcc-rembg")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("rembg", "onnxruntime", "pillow", "fastapi")
    .run_commands("python -c \"from rembg.bg import remove; from rembg.session_factory import new_session; new_session('u2net')\"")
)

@app.function(image=image, timeout=300, scaledown_window=300)
@modal.fastapi_endpoint(method="POST")
def remove_bg(data: dict):
    """Accept base64 PNG, return base64 PNG with background removed."""
    import base64
    import io
    from rembg.bg import remove
    from PIL import Image

    input_bytes = base64.b64decode(data["image"])
    input_image = Image.open(io.BytesIO(input_bytes))
    output_image = remove(input_image)

    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    return {"image": base64.b64encode(buf.getvalue()).decode()}


@app.function(image=image, timeout=60, scaledown_window=300)
@modal.fastapi_endpoint(method="GET")
def health():
    """Lightweight health check — verifies rembg + model file are present."""
    import os
    from rembg.bg import remove  # noqa: F401 — verify import works
    model_path = os.path.expanduser("~/.u2net/u2net.onnx")
    model_exists = os.path.isfile(model_path)
    return {"status": "ok" if model_exists else "error", "model": model_exists}
