import { ICON_MAP, DefaultIcon } from './iconMap';

export function CategoryIcon({ name, ...props }) {
  const Icon = ICON_MAP[name] || DefaultIcon;
  return <Icon {...props} />;
}
