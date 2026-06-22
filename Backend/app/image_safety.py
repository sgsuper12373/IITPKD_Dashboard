"""Strict image validation + re-encoding for feedback screenshots.

Defends against the abuse seen after launch (stickers, animated GIFs, phishing /
nude images, files renamed to look like images, polyglot payloads):

  * the file type is determined by **decoding** the bytes (Pillow), not by the
    client-supplied name or MIME — a `.gif` renamed to `.png` is still rejected;
  * only static JPEG / PNG are allowed; animated frames are rejected;
  * size and pixel dimensions are capped;
  * the image is **re-encoded** from decoded pixels, which discards EXIF, trailing
    bytes, and any data appended after the image stream.

This runs server-side because a browser-side check is trivially bypassed by
POSTing straight to the endpoint.
"""
import io

from PIL import Image

# Pillow guards against decompression-bomb DoS; keep its default but be explicit.
Image.MAX_IMAGE_PIXELS = 40_000_000  # ~40 MP

MAX_BYTES = 5 * 1024 * 1024          # 5 MB raw
MAX_DIMENSION = 4000                 # px, per side
MIN_DIMENSION = 10                   # px, per side
ALLOWED_FORMATS = {'JPEG', 'PNG'}


class ImageRejected(ValueError):
    """Raised when an uploaded image fails a safety check. Message is user-safe."""


def validate_and_reencode(raw_bytes):
    """
    Validates ``raw_bytes`` as a safe static JPEG/PNG and returns a cleaned copy.

    Returns ``(clean_bytes, content_type, ext)``.
    Raises :class:`ImageRejected` with a user-facing message on any violation.
    """
    if not raw_bytes:
        raise ImageRejected('No image data received.')
    if len(raw_bytes) > MAX_BYTES:
        raise ImageRejected('Image must be smaller than 5 MB.')

    # Pass 1: verify() detects truncated/corrupt files but consumes the image,
    # so it must be followed by a fresh open for any real work.
    try:
        Image.open(io.BytesIO(raw_bytes)).verify()
    except Exception:
        raise ImageRejected('File is not a valid image.')

    # Pass 2: reopen for inspection + re-encoding.
    try:
        img = Image.open(io.BytesIO(raw_bytes))
    except Exception:
        raise ImageRejected('File is not a valid image.')

    fmt = (img.format or '').upper()
    if fmt not in ALLOWED_FORMATS:
        raise ImageRejected('Only JPG and PNG images are allowed.')

    # Reject animated images (multi-frame PNG/APNG, or anything Pillow reports >1 frame).
    if getattr(img, 'n_frames', 1) > 1:
        raise ImageRejected('Animated images are not allowed. Use a static JPG or PNG.')

    width, height = img.size
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise ImageRejected(f'Image is too large (max {MAX_DIMENSION}px per side).')
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        raise ImageRejected('Image is too small to be a valid screenshot.')

    # Re-encode from decoded pixels → strips EXIF / trailing payload / polyglot data.
    out = io.BytesIO()
    if fmt == 'PNG':
        img.convert('RGBA' if 'A' in img.getbands() else 'RGB').save(out, format='PNG', optimize=True)
        return out.getvalue(), 'image/png', 'png'

    # JPEG
    img.convert('RGB').save(out, format='JPEG', quality=85, optimize=True)
    return out.getvalue(), 'image/jpeg', 'jpg'
