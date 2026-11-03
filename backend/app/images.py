"""Картинки товаров генерируются на лету: репозиторию не нужны бинарные файлы."""

from html import escape

PALETTE: dict[str, tuple[str, str]] = {
    "green": ("#d9ead3", "#2f5d27"),
    "black": ("#ead7cf", "#5a2a1a"),
    "oolong": ("#f1e3c4", "#6b4a12"),
    "puer": ("#e2d6cc", "#4a3324"),
    "white": ("#eeeeea", "#4d4d43"),
    "herbal": ("#e4ecd5", "#3d5320"),
}


def product_svg(name: str, category: str) -> bytes:
    bg, fg = PALETTE.get(category, ("#eeeeee", "#333333"))
    title = escape(name)
    initial = escape(name[:1].upper())
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" '
        'viewBox="0 0 480 360" role="img">'
        f"<title>{title}</title>"
        f'<rect width="480" height="360" fill="{bg}"/>'
        f'<circle cx="240" cy="160" r="90" fill="{fg}" opacity="0.12"/>'
        f'<text x="240" y="195" font-family="Georgia, serif" font-size="110" '
        f'text-anchor="middle" fill="{fg}">{initial}</text>'
        "</svg>"
    )
    return svg.encode()


# Обрезанный файл: сервер отдаёт 200, но браузер не может его декодировать.
BROKEN_SVG = b'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect wi'
