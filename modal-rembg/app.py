import modal

app = modal.App("clcc-rembg")

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "rembg", "onnxruntime", "pillow", "fastapi"
)

@app.function(image=image, timeout=120)
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
