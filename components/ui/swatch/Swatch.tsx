import {
  Box, type BoxProps, createVarsResolver, type ElementProps,
  factory, type Factory, getRadius, getSize, type MantineRadius, type MantineSize,
  type StylesApiProps, useProps, useStyles,
} from '@mantine/core';
import classes from './Swatch.module.css';

/**
 * Amostra de cor de um token da marca. Construída com a Styles API para que o tema
 * possa redefinir tamanho, raio e classes sem tocar no componente.
 */
export type SwatchStylesNames = 'root' | 'chip' | 'label';
export type SwatchVariant = 'tile' | 'dot';
export type SwatchCssVariables = { root: '--swatch-size' | '--swatch-radius' | '--swatch-color' };

export interface SwatchProps extends BoxProps, StylesApiProps<SwatchFactory>, ElementProps<'div'> {
  /** Cor hexadecimal do token. */
  color: string;
  size?: MantineSize | (string & {}) | number;
  radius?: MantineRadius;
  /** Mostra o valor hexadecimal abaixo da amostra. */
  withLabel?: boolean;
}

export type SwatchFactory = Factory<{
  props: SwatchProps;
  ref: HTMLDivElement;
  stylesNames: SwatchStylesNames;
  vars: SwatchCssVariables;
  variant: SwatchVariant;
}>;

const defaultProps = { size: 'md', radius: 'sm', withLabel: true, variant: 'tile' } satisfies Partial<SwatchProps>;

const sizes: Record<string, string> = { xs: '22px', sm: '36px', md: '64px', lg: '80px', xl: '96px' };

const varsResolver = createVarsResolver<SwatchFactory>((_theme, { size, radius, color }) => ({
  root: {
    '--swatch-size': typeof size === 'number' ? `${size}px` : (sizes[size ?? 'md'] ?? getSize(size, 'swatch-size')),
    '--swatch-radius': getRadius(radius),
    '--swatch-color': color,
  },
}));

export const Swatch = factory<SwatchFactory>((_props) => {
  const props = useProps('Swatch', defaultProps, _props);
  const { classNames, className, style, styles, unstyled, vars, attributes, color, size, radius, withLabel, variant, ref, ...others } = props;

  const getStyles = useStyles<SwatchFactory>({
    name: 'Swatch', classes, props,
    className, style, classNames, styles, unstyled, vars, attributes, varsResolver,
  });

  return (
    <Box ref={ref} data-variant={variant} title={color} {...getStyles('root')} {...others}>
      <Box {...getStyles('chip')} />
      {withLabel && <Box component="span" {...getStyles('label')}>{color}</Box>}
    </Box>
  );
});

Swatch.displayName = 'Swatch';
Swatch.classes = classes;
