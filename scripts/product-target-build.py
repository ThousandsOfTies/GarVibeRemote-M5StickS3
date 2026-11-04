"""GAR native build hook. Compile and package only; never opens a USB device."""
from composition import product
from embedded import build
from esp32_bundle import export

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 1:
        raise SystemExit('Only build is supported by this hook')
    selected = product()
    print(export(selected, build(selected)))
