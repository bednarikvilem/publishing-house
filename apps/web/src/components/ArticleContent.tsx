import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { ImageNode } from "../lib/lexical/ImageNode";

const viewerTheme = {
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
  },
  list: {
    ul: "list-disc pl-6 my-2",
    ol: "list-decimal pl-6 my-2",
    listitem: "my-0.5",
    nested: { listitem: "list-none" },
  },
  quote:
    "border-l-4 border-border bg-muted px-8 py-6 text-foreground italic my-3",
  heading: {
    h1: "text-3xl-plus font-bold tracking-snug my-3",
    h2: "text-2xl font-bold tracking-snug my-3",
    h3: "text-xl font-bold my-2",
  },
  paragraph: "text-foreground text-base leading-xl my-1",
};

export function ArticleContent({ content }: { content: string }) {
  let editorState: string | undefined;
  try {
    const parsed = JSON.parse(content);
    if (parsed.root) editorState = content;
  } catch {
    // plain text fallback
  }

  return (
    <div className="flex flex-col gap-6">
      {editorState ? (
        <LexicalComposer
          initialConfig={{
            namespace: "ArticleViewer",
            theme: viewerTheme,
            nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, ImageNode],
            onError: (error: Error) => console.error("Lexical error:", error),
            editorState,
            editable: false,
          }}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="text-foreground text-base leading-xl outline-none" />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <ListPlugin />
        </LexicalComposer>
      ) : (
        <p className="text-foreground text-base leading-xl">{content}</p>
      )}
    </div>
  );
}
