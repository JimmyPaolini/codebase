import { ReactElement } from "react";

// 🔖 Type
export interface {{namePascalCase}}Properties {
  className?: string;
}

// 🧩 Component
export const {{namePascalCase}} = (
  properties: {{namePascalCase}}Properties
): ReactElement => {
  const { className } = properties;

  // 🪝 Hooks

  // 🏗 Setup

  // 💪 Handler

  // 🎨 Markup

  // ♻️ Lifecycle

  // 🔌 Short Circuits

  return (
    <div className={className}>
      {{namePascalCase}} component
    </div>
  );
};
