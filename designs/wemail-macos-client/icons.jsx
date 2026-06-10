function Icon({ name, label, size = 16, className = "" }) {
  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          "stroke-width": "1.8",
          "absolute-stroke-width": "true"
        }
      });
    }
  });

  return (
    <i
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      className={`lucide-icon ${className}`}
      data-lucide={name}
      role={label ? "img" : undefined}
      style={{ width: size, height: size }}
    ></i>
  );
}

Object.assign(window, { Icon });
