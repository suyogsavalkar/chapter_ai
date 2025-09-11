"use client";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";
import type { Vote } from "@/lib/db/schema";
import { DocumentToolResult } from "./document";
import { PencilEditIcon, SparklesIcon, LoaderIcon } from "./icons";
import { Response } from "./elements/response";
import { MessageContent } from "./elements/message";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";
import equal from "fast-deep-equal";
import { cn, sanitizeText } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { MessageEditor } from "./message-editor";
import { DocumentPreview } from "./document-preview";
import { MessageReasoning } from "./message-reasoning";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";
import { useDataStream } from "./data-stream-provider";
import { useToolkits } from "@/hooks/use-toolkits";

// Type narrowing is handled by TypeScript's control flow analysis
// The AI SDK provides proper discriminated unions for tool calls

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
  isArtifactVisible,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  isArtifactVisible: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();
  const { getBySlug } = useToolkits();

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn("flex items-start gap-3", {
            "w-full": mode === "edit",
            "max-w-xl ml-auto justify-end mr-6":
              message.role === "user" && mode !== "edit",
            "justify-start -ml-3": message.role === "assistant",
          })}
        >
          {message.role === "assistant" && (
            <div className="flex justify-center items-center mt-1 rounded-full ring-1 size-8 shrink-0 ring-border bg-background">
              <SparklesIcon size={14} />
            </div>
          )}

          <div
            className={cn("flex flex-col gap-4", {
              "min-h-96": message.role === "assistant" && requiresScrollPadding,
              "w-full": message.role === "assistant",
              "w-fit": message.role === "user",
            })}
          >
            {attachmentsFromMessage.length > 0 && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row gap-2 justify-end"
              >
                {attachmentsFromMessage.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={{
                      name: attachment.filename ?? "file",
                      contentType: attachment.mediaType,
                      url: attachment.url,
                    }}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === "reasoning" && part.text?.trim().length > 0) {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.text}
                  />
                );
              }

              if (type === "text") {
                if (mode === "view") {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === "user" && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 rounded-full opacity-0 h-fit text-muted-foreground group-hover/message:opacity-100"
                              onClick={() => {
                                setMode("edit");
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <MessageContent
                        data-testid="message-content"
                        className={cn("justify-start items-start text-left", {
                          "bg-primary text-primary-foreground":
                            message.role === "user",
                          "bg-transparent -ml-4": message.role === "assistant",
                        })}
                      >
                        <Response>{sanitizeText(part.text)}</Response>
                      </MessageContent>
                    </div>
                  );
                }

                if (mode === "edit") {
                  return (
                    <div
                      key={key}
                      className="flex flex-row gap-3 items-start w-full"
                    >
                      <div className="size-8" />
                      <div className="flex-1 min-w-0">
                        <MessageEditor
                          key={message.id}
                          message={message}
                          setMode={setMode}
                          setMessages={setMessages}
                          regenerate={regenerate}
                        />
                      </div>
                    </div>
                  );
                }
              }

              if (type === "tool-getWeather") {
                const { toolCallId, state } = part;

                return (
                  <Tool key={toolCallId} defaultOpen={true}>
                    <ToolHeader type="tool-getWeather" state={state} />
                    <ToolContent>
                      {state === "input-available" && (
                        <ToolInput input={part.input} />
                      )}
                      {state === "output-available" && (
                        <ToolOutput
                          output={<Weather weatherAtLocation={part.output} />}
                          errorText={undefined}
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              if (type === "tool-createDocument") {
                const { toolCallId } = part;

                if (part.output && "error" in part.output) {
                  return (
                    <div
                      key={toolCallId}
                      className="p-4 text-red-500 bg-red-50 rounded-lg border border-red-200 dark:bg-red-950/50"
                    >
                      Error creating document: {String(part.output.error)}
                    </div>
                  );
                }

                return (
                  <DocumentPreview
                    key={toolCallId}
                    isReadonly={isReadonly}
                    result={part.output}
                  />
                );
              }

              if (type === "tool-updateDocument") {
                const { toolCallId } = part;

                if (part.output && "error" in part.output) {
                  return (
                    <div
                      key={toolCallId}
                      className="p-4 text-red-500 bg-red-50 rounded-lg border border-red-200 dark:bg-red-950/50"
                    >
                      Error updating document: {String(part.output.error)}
                    </div>
                  );
                }

                return (
                  <div key={toolCallId} className="relative">
                    <DocumentPreview
                      isReadonly={isReadonly}
                      result={part.output}
                      args={{ ...part.output, isUpdate: true }}
                    />
                  </div>
                );
              }

              if (type === "tool-requestSuggestions") {
                const { toolCallId, state } = part;

                return (
                  <Tool key={toolCallId} defaultOpen={true}>
                    <ToolHeader type="tool-requestSuggestions" state={state} />
                    <ToolContent>
                      {state === "input-available" && (
                        <ToolInput input={part.input} />
                      )}
                      {state === "output-available" && (
                        <ToolOutput
                          output={
                            "error" in part.output ? (
                              <div className="p-2 text-red-500 rounded border">
                                Error: {String(part.output.error)}
                              </div>
                            ) : (
                              <DocumentToolResult
                                type="request-suggestions"
                                result={part.output}
                                isReadonly={isReadonly}
                              />
                            )
                          }
                          errorText={undefined}
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              // Generic tool rendering for unknown tools (e.g., Composio)
              if (type?.startsWith("tool-")) {
                const toolId = type.slice(5);
                // Heuristics to derive toolkit slug from toolId
                const deriveSlug = (name: string): string | undefined => {
                  const lower = name.toLowerCase();
                  if (lower.includes("gmail")) return "GMAIL";
                  if (
                    lower.includes("googlecalendar") ||
                    lower.includes("calendar")
                  )
                    return "GOOGLECALENDAR";
                  if (lower.includes("slack")) return "SLACK";
                  // try prefix until non-letter
                  const m = name.match(/^([a-zA-Z]+)/);
                  return m ? m[1].toUpperCase() : undefined;
                };
                const slug = deriveSlug(toolId);
                const meta = getBySlug(slug || null);

                const displayName = meta?.name || slug || toolId;

                return (
                  <div key={key} className="flex items-center gap-2 -ml-2">
                    <div className="flex justify-center items-center mt-1 rounded-full ring-1 size-6 shrink-0 ring-border bg-background overflow-hidden">
                      {meta?.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={meta.logo}
                          alt={`${displayName} logo`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="size-3.5 animate-spin text-muted-foreground">
                          <LoaderIcon size={14} />
                        </div>
                      )}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Using {displayName}
                    </div>
                  </div>
                );
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return false;
  }
);

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div className="flex items-start gap-3 justify-start -ml-3">
        <div className="flex justify-center items-center mt-1 rounded-full ring-1 size-8 shrink-0 ring-border bg-background">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-4 w-full">
          <MessageContent className="bg-transparent -ml-4">
            <div className="text-muted-foreground">Working...</div>
          </MessageContent>
        </div>
      </div>
    </motion.div>
  );
};
