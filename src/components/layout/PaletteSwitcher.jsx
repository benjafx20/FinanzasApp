import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PALETTES } from '../../utils/palettes';
import { useTheme } from '../../context/ThemeContext';
import './PaletteSwitcher.css';

export function PaletteSwitcher() {
  const [open, setOpen] = useState(false);
  const { palette, setPalette } = useTheme();

  return (
    <>
      <button
        className="palette-switcher__trigger"
        onClick={() => setOpen(true)}
        aria-label="Elegir paleta de colores"
      >
        <Palette size={14} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Elige una paleta">
        <div className="palette-switcher__list">
          {PALETTES.map((p) => {
            const active = p.id === palette;
            return (
              <button
                key={p.id}
                className={`palette-switcher__option ${active ? 'palette-switcher__option--active' : ''}`}
                onClick={() => {
                  setPalette(p.id);
                  setOpen(false);
                }}
              >
                <span className="palette-switcher__swatch">
                  <span style={{ background: p.swatch[0] }} />
                  <span style={{ background: p.swatch[1] }} />
                </span>
                <span className="palette-switcher__texto">
                  <span className="palette-switcher__nombre">{p.nombre}</span>
                  <span className="palette-switcher__descripcion">{p.descripcion}</span>
                </span>
                {active && <Check size={18} className="palette-switcher__check" />}
              </button>
            );
          })}
        </div>
        <p className="palette-switcher__nota">
          Elige la que más te acomode hoy — se guarda en este celular y se puede cambiar cuando quieras.
        </p>
      </Modal>
    </>
  );
}
