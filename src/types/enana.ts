/**
 * Enana UI Component Type Definitions
 * Based on widget.schema.json
 */

// 辅助类型
export type Color = [number, number, number, number]; // RGBA颜色值，格式：[红, 绿, 蓝, 透明度]，透明度范围0-255
export type Size = 'cover' | 'contain' | 'default'; // 图片缩放方式

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BorderRadius {
  top_left: number;
  top_right: number;
  bottom_right: number;
  bottom_left: number;
}

// 基础组件类型
export interface Widget {
  type: string;
}

export interface BaseComponent {
  width?: number;
  height?: number;
  color?: Color;
  padding?: number | Padding;
  margin?: number | Margin;
  border_radius?: number | BorderRadius;
}

// 文本组件
export interface TextComponent extends Widget {
  type: 'Text';
  text: string;
  font?: string;
  font_size?: number;
  max_width?: number;
  color?: Color;
}

// 图片组件
export interface ImageComponent extends Widget {
  type: 'Image';
  url: string;
  width?: number;
  height?: number;
  size?: Size;
}

// 容器组件
export interface ContainerComponent extends Widget, BaseComponent {
  type: 'Container';
  child: WidgetComponent;
}

// 列组件
export interface ColumnComponent extends Widget, BaseComponent {
  type: 'Column';
  children: WidgetComponent[];
}

// 行组件
export interface RowComponent extends Widget, BaseComponent {
  type: 'Row';
  children: WidgetComponent[];
}

// 页面组件
export interface PageComponent extends Widget {
  type: 'Page';
  child: WidgetComponent;
}

// 联合类型：所有可能的组件类型
export type WidgetComponent =
  | PageComponent
  | ContainerComponent
  | ColumnComponent
  | RowComponent
  | TextComponent
  | ImageComponent;
