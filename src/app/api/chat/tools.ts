import {
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationsTool,
} from "@google-cloud/vertexai";

/**
 * `create_presentation` — generate a brand-new slide deck.
 *
 * The model fills in `title` + `instructions`; the route handler then performs
 * a separate JSON-mode generation to produce the structured slide data.
 */
export const createPresentationDecl: FunctionDeclaration = {
  name: "create_presentation",
  description:
    "Generate a complete slide presentation. Use when the user asks for slides, a deck, a presentation, a pitch, a keynote, or any structured slide-based output.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description:
          "Presentation title — short and punchy (≤8 words). Used in the chat card and as the .pptx file name.",
      },
      instructions: {
        type: SchemaType.STRING,
        description:
          "Detailed brief: audience, tone, slide count, specific data, charts, or topics to cover. Include any data the user provided verbatim.",
      },
      slideCount: {
        type: SchemaType.INTEGER,
        description: "Target number of slides (default 8 if unspecified).",
      },
    },
    required: ["title", "instructions"],
  },
};

/**
 * `edit_presentation` — modify a previously generated deck.
 */
export const editPresentationDecl: FunctionDeclaration = {
  name: "edit_presentation",
  description:
    "Modify an existing presentation. Use for refinements like 'add a slide about X', 'change the conclusion', 'use different data', or 'switch the theme to dark'.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      artifactId: {
        type: SchemaType.STRING,
        description:
          "ID of the existing presentation, taken from a prior assistant message that contained an ArtifactSlidesBlock.",
      },
      version: {
        type: SchemaType.STRING,
        description:
          "Specific version to edit. Omit to edit the latest version.",
      },
      instructions: {
        type: SchemaType.STRING,
        description:
          "What to change. Be explicit about which slide(s) to modify and what the new content should look like.",
      },
    },
    required: ["artifactId", "instructions"],
  },
};

export const slidesTools: FunctionDeclarationsTool = {
  functionDeclarations: [createPresentationDecl, editPresentationDecl],
};
