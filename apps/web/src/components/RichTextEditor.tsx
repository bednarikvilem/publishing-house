import { useCallback, useEffect, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
  $getSelection,
  $isRangeSelection,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  FORMAT_TEXT_COMMAND,
  type EditorState,
} from "lexical";
import { API_BASE_URL, authHeaders } from "../lib/api";
import {
  ImageNode,
  INSERT_IMAGE_COMMAND,
  $createImageNode,
} from "../lib/lexical/ImageNode";
import { Button } from "@/components/ui/button";

const editorTheme = {
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
  quote: "border-l-4 border-border pl-4 text-muted-foreground italic my-3",
  heading: {
    h1: "text-2xl font-bold my-3",
    h2: "text-xl font-bold my-3",
    h3: "text-lg font-bold my-2",
  },
  paragraph: "my-1",
};

function ImagePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      ({ url, alt }) => {
        $insertNodes([$createImageNode(url, alt)]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);
  return null;
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
  className = "",
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      onClick={onClick}
      className={`px-2.5 py-1 text-[13px] font-medium ${active ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background" : "text-muted-foreground"} ${className}`}
    >
      {children}
    </Button>
  );
}

function ToolbarPlugin({
  newspaperId,
  articleId,
  hasCoverImage,
  onUploadError,
}: {
  newspaperId?: string;
  articleId?: string;
  hasCoverImage?: boolean;
  onUploadError?: (msg: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));
        }
      });
    });
  }, [editor]);

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !newspaperId || !articleId) return;
    e.target.value = "";
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/images`,
        { method: "POST", headers: authHeaders(), body: formData }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        onUploadError?.(data.error ?? "Failed to upload image.");
        return;
      }
      const img = (await res.json()) as { url: string; caption: string | null };
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        url: img.url,
        alt: img.caption ?? file.name,
      });
    } catch {
      onUploadError?.("Network error while uploading image.");
    } finally {
      setUploading(false);
    }
  }

  const articleSaved = Boolean(newspaperId && articleId);
  const imageButtonEnabled = articleSaved && hasCoverImage && !uploading;
  const imageButtonTitle = !articleSaved
    ? "Save the article first to insert inline images"
    : !hasCoverImage
      ? "Upload a cover image in the sidebar before inserting inline images"
      : "Insert inline image at cursor";

  return (
    <div className="border-border flex items-center gap-0.5 border-b px-3 py-2">
      <ToolbarButton
        active={isBold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        title="Bold (Ctrl+B)"
        className="font-bold"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={isItalic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        title="Italic (Ctrl+I)"
        className="italic"
      >
        I
      </ToolbarButton>
      <ToolbarButton
        active={isUnderline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        title="Underline (Ctrl+U)"
        className="underline"
      >
        U
      </ToolbarButton>
      <div className="bg-border mx-1.5 h-4 w-px" />
      <ToolbarButton
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        title="Bullet list"
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        title="Numbered list"
      >
        1. List
      </ToolbarButton>
      <div className="bg-border mx-1.5 h-4 w-px" />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleImageFile}
      />
      <ToolbarButton
        onClick={() => imageButtonEnabled && imageInputRef.current?.click()}
        title={imageButtonTitle}
        className={!imageButtonEnabled ? "cursor-not-allowed opacity-40" : ""}
      >
        {uploading ? "…" : "Inline image"}
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  initialContent,
  onContentChange,
  newspaperId,
  articleId,
  hasCoverImage,
  onUploadError,
}: {
  initialContent: string;
  onContentChange: (json: string) => void;
  newspaperId?: string;
  articleId?: string;
  hasCoverImage?: boolean;
  onUploadError?: (msg: string) => void;
}) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      onContentChange(JSON.stringify(editorState.toJSON()));
    },
    [onContentChange]
  );

  let initialEditorState: string | undefined;
  try {
    const parsed = JSON.parse(initialContent);
    if (parsed.root) initialEditorState = initialContent;
  } catch {
    // Not Lexical JSON — editor starts empty
  }

  return (
    <LexicalComposer
      initialConfig={{
        namespace: "ArticleEditor",
        theme: editorTheme,
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, ImageNode],
        onError: (error: Error) => console.error("Lexical error:", error),
        editorState: initialEditorState,
      }}
    >
      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <ToolbarPlugin
          newspaperId={newspaperId}
          articleId={articleId}
          hasCoverImage={hasCoverImage}
          onUploadError={onUploadError}
        />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-placeholder="Write your article content here…"
                placeholder={
                  <div className="text-muted-foreground pointer-events-none absolute top-4 left-4 text-[15px] select-none">
                    Write your article content here…
                  </div>
                }
                className="text-foreground min-h-[420px] px-4 py-4 text-[15px] leading-relaxed outline-none"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <ImagePlugin />
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        </div>
      </div>
    </LexicalComposer>
  );
}
