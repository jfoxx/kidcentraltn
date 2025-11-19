/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */


export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {HTMLElement} The root element to be transformed
   */
  transformDOM: ({ document, url, html, params }) => {
    // Check if this is an event page
    const isEventPage = url.includes('/schedule-of-events/') || 
                       url.includes('/events-and-promotions/');

    if (!isEventPage) {
      // For non-event pages, use default transformation
      return document.body;
    }

    // Extract event information
    const eventInfo = extractEventInfo(document);

    // Use helper to remove header, footer and other elements
    WebImporter.DOMUtils.remove(document, [
      'header',
      'footer',
      'nav',
      '.header',
      '.footer',
      '.navigation',
      '.breadcrumb',
      'script',
      'noscript',
      'style',
    ]);

    const main = document.body;

    // Create a new structure for the event page
    const sections = [];

    // Section 1: Hero with image and title
    const heroSection = document.createElement('div');
    
    // Find the main event image
    const mainImage = main.querySelector('img[alt], img[src*="media_"]');
    if (mainImage) {
      const heroDiv = document.createElement('div');
      const heroContent = document.createElement('div');
      const heroPicture = mainImage.closest('picture') || mainImage;
      heroContent.append(heroPicture.cloneNode(true));
      heroDiv.append(heroContent);
      
      // Create hero block
      const heroBlock = WebImporter.DOMUtils.createTable([
        ['Hero'],
        [heroDiv],
      ], document);
      heroSection.append(heroBlock);
    }

    // Add the title
    const title = main.querySelector('h1, h2');
    if (title) {
      heroSection.append(title.cloneNode(true));
    }

    // Add the description/body paragraphs
    const paragraphs = Array.from(main.querySelectorAll('p')).filter(p => {
      const text = p.textContent.trim();
      // Filter out navigation, links, and very short paragraphs
      return text.length > 50 && 
             !text.match(/^(on-sale|view|purchase|at\s+[A-Z])/i) &&
             !p.querySelector('a[href*="ticketmaster"]');
    });

    // Keep reference to first paragraph for metadata description
    const firstParagraph = paragraphs[0];

    paragraphs.forEach(p => {
      heroSection.append(p.cloneNode(true));
    });

    // Add section metadata for center alignment
    const sectionMetadata = WebImporter.DOMUtils.createTable([
      ['Section Metadata'],
      ['text-align', 'center'],
    ], document);
    heroSection.append(sectionMetadata);

    sections.push(heroSection);

    // Section 2: Disclaimers (reference to fragment)
    const disclaimerSection = document.createElement('div');
    const disclaimerLink = document.createElement('a');
    disclaimerLink.href = '/fragments/event-disclaimers';
    disclaimerLink.textContent = '/fragments/event-disclaimers';
    const disclaimerH3 = document.createElement('h3');
    disclaimerH3.append(disclaimerLink);
    disclaimerSection.append(disclaimerH3);
    sections.push(disclaimerSection);

    // Clear main and add sections
    main.innerHTML = '';
    sections.forEach(section => main.append(section));

    // Create metadata block
    createMetadata(main, document, eventInfo, firstParagraph);

    return main;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {String} url The url of the document being transformed.
   * @param {HTMLDocument} document The document
   */
  generateDocumentPath: ({ document, url }) => {
    // Extract path from URL
    let path = new URL(url).pathname;
    
    // Remove .html extension if present
    if (path.endsWith('.html')) {
      path = path.slice(0, -5);
    }
    
    return path;
  },
};
