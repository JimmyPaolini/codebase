import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { createElement } from 'react';
import { faker } from '@faker-js/faker';
import { {{namePascalCase}}, type {{namePascalCase}}Properties } from './{{namePascalCase}}';

describe('{{namePascalCase}}', () => {
  // 🎭 Mocks
  let properties: {{namePascalCase}}Properties;

  // 🏗 Setup
  beforeEach(() => {
    properties = {
      className: faker.string.alpha(10),
    };
  });

  // 🧪 Tests

  it('should render successfully', () => {
    const element = createElement({{namePascalCase}}, properties);
    const { container } = render(element);
    expect(container).toBeInTheDocument();
  });
});
