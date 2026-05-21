import type {
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { DecoratorNode, createCommand } from "lexical";
import type { JSX } from "react";

export type SerializedImageNode = Spread<
  { url: string; alt: string },
  SerializedLexicalNode
>;

export const INSERT_IMAGE_COMMAND = createCommand<{ url: string; alt: string }>(
  "INSERT_IMAGE_COMMAND"
);

export class ImageNode extends DecoratorNode<JSX.Element> {
  __url: string;
  __alt: string;

  static override getType(): string {
    return "image";
  }

  static override clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__url, node.__alt, node.__key);
  }

  constructor(url: string, alt: string, key?: NodeKey) {
    super(key);
    this.__url = url;
    this.__alt = alt;
  }

  override createDOM(_config: EditorConfig): HTMLElement {
    const figure = document.createElement("figure");
    figure.style.margin = "1rem 0";
    return figure;
  }

  override updateDOM(): false {
    return false;
  }

  override exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.src = this.__url;
    img.alt = this.__alt;
    return { element: img };
  }

  static override importJSON(serialized: SerializedImageNode): ImageNode {
    return $createImageNode(serialized.url, serialized.alt);
  }

  override exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: "image",
      url: this.__url,
      alt: this.__alt,
      version: 1,
    };
  }

  override decorate(
    _editor: LexicalEditor,
    _config: EditorConfig
  ): JSX.Element {
    return (
      <img
        src={this.__url}
        alt={this.__alt}
        className="my-4 max-h-[480px] w-full rounded-lg object-cover"
      />
    );
  }
}

export function $createImageNode(url: string, alt: string): ImageNode {
  return new ImageNode(url, alt);
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode;
}
