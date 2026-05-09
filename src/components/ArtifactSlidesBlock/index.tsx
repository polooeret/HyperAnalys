"use client";

import { Artifact } from "@openuidev/react-ui";
import { defineComponent } from "@openuidev/react-lang";

import { ArtifactView } from "./ArtifactView";
import { InlinePreview } from "./InlinePreview";
import { ArtifactSlidesBlockSchema } from "./schema";

export { ArtifactSlidesBlockSchema } from "./schema";
export type { ArtifactSlidesBlockProps } from "./schema";

export const ArtifactSlidesBlock = defineComponent({
  name: "ArtifactSlidesBlock",
  props: ArtifactSlidesBlockSchema,
  description:
    "Inline slide presentation card. Pass artifactId + version + title — the full slide data is fetched from /api/artifact/[id]. Clicking opens the deck fullscreen with animated transitions.",
  component: Artifact({
    title: (props) => props.title,
    preview: (props, { open, isActive }) => (
      <InlinePreview
        artifactId={props.artifactId}
        version={props.version}
        title={props.title}
        open={open}
        isActive={isActive}
      />
    ),
    panel: (props) => (
      <ArtifactView
        artifactId={props.artifactId}
        version={props.version}
        title={props.title}
      />
    ),
  }),
});
