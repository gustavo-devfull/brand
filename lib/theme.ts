import { createTheme, type MantineColorsTuple } from '@mantine/core';

/** Laranja da marca. O degrau 5 é o #FF6B00 exato; é o `primaryShade`. */
const brand: MantineColorsTuple = [
  '#fff1e6', '#ffe0c7', '#ffc599', '#ffa666', '#ff8a38',
  '#ff6b00', '#e85f00', '#c24f00', '#9c4000', '#7a3200',
];

/** Azul-marinho da marca no degrau 9; os anteriores formam a escala neutra da interface. */
const navy: MantineColorsTuple = [
  '#f0f4f8', '#d9e2ec', '#bcccdc', '#9fb3c8', '#829ab1',
  '#627d98', '#486581', '#334e68', '#243b53', '#102a43',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 5,
  colors: { brand, navy },
  black: '#102a43',
  white: '#ffffff',
  fontFamily: 'var(--font-ui), "Segoe UI", Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, "Cascadia Mono", Menlo, monospace',
  headings: {
    fontFamily: 'var(--font-ui), "Segoe UI", Arial, sans-serif',
    fontWeight: '800',
    sizes: {
      h1: { fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', lineHeight: '1', fontWeight: '800' },
      h2: { fontSize: '1.05rem', lineHeight: '1.2', fontWeight: '700' },
      h3: { fontSize: '1rem', lineHeight: '1.3', fontWeight: '700' },
    },
  },
  defaultRadius: 'md',
  radius: { xs: '6px', sm: '10px', md: '14px', lg: '18px', xl: '24px' },
  shadows: {
    xs: '0 1px 2px rgba(16, 42, 67, 0.04)',
    sm: '0 8px 20px rgba(16, 42, 67, 0.06)',
    md: '0 12px 30px rgba(16, 42, 67, 0.08)',
    lg: '0 20px 50px rgba(16, 42, 67, 0.10)',
  },
  components: {
    Paper: { defaultProps: { radius: 'lg', withBorder: true, shadow: 'sm', p: 'lg' } },
    Button: { defaultProps: { radius: 'md', fw: 700 } },
    Badge: { defaultProps: { radius: 'xl' } },
    TextInput: { defaultProps: { radius: 'md' } },
    NumberInput: { defaultProps: { radius: 'md' } },
    Textarea: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
    Modal: { defaultProps: { radius: 'xl', centered: true, overlayProps: { backgroundOpacity: 0.45, blur: 3 } } },
  },
});
