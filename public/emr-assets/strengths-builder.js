'use strict';

// Enhances the existing narrative fields; saved chart versions keep their wording.
const strengthsOriginalFields = structuredSectionFields;
structuredSectionFields = function(key, saved) {
  if (key !== 'strengths') return strengthsOriginalFields(key, saved);
  return `<section id="strengths-builder" aria-labelledby="strengths-builder-title">
    <h3 id="strengths-builder-title">Strengths and Weaknesses / Challenges form builder</h3>
    <p>Select applicable descriptors, review the preview, then insert them into the EMR fields below. You can edit the wording before saving. Nothing is selected by default.</p>
    <p class="hint">Original descriptive library; individualize with the person’s perspective, context, and supporting examples. This is not a scored assessment.</p>
    <div class="descriptor-filters">
      <label class="field" for="descriptor-search">Search descriptors<input id="descriptor-search" name="descriptor_search" type="search" autocomplete="off"></label>
      <label class="field" for="descriptor-domain">Domain<select id="descriptor-domain" name="descriptor_domain"><option value="">All domains</option>${[...new Set(STRENGTHS_LIBRARY.items.map(x => x.domain))].map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}<option value="Custom descriptors">Custom descriptors</option></select></label>
      <label class="check"><input id="descriptor-selected-only" name="descriptor_selected_only" type="checkbox">Show selected only</label>
    </div>
    <p id="descriptor-count" role="status" aria-live="polite"></p>
    <div id="descriptor-options" class="descriptor-columns"></div>
    <details class="descriptor-custom"><summary>Add your own field items</summary>
      <p>Paste one descriptor per line. Added choices are available for this open form; inserted wording is retained when you save the section.</p>
      <label class="field" for="descriptor-custom-type">Add to<select id="descriptor-custom-type" name="descriptor_custom_type"><option value="strength">Strengths</option><option value="growth_or_support_need">Weaknesses / Challenges / Support Needs</option></select></label>
      <label class="field" for="descriptor-custom-text">Custom descriptors, one per line<textarea id="descriptor-custom-text" name="descriptor_custom_text" maxlength="12000" rows="4"></textarea></label>
      <button id="descriptor-add-custom" type="button" class="secondary">Add field items</button>
    </details>
    <label class="field" for="descriptor-preview">Selected wording preview<textarea id="descriptor-preview" name="descriptor_preview" rows="7" readonly></textarea></label>
    <div class="actions"><button id="descriptor-insert" type="button">Insert selected into EMR fields</button><button id="descriptor-copy" type="button" class="secondary">Copy selected wording</button><button id="descriptor-clear" type="button" class="secondary">Clear selections</button></div>
    <p id="descriptor-status" role="status" aria-live="polite"></p>
    <p class="hint">Insert appends wording and preserves existing text. Save Strengths/Weaknesses below to retain this assessment in the chart. Saving also inserts any pending selections.</p>
  </section>${strengthsOriginalFields(key, saved)}`;
};

const strengthsOriginalBind = bindModuleSection;
bindModuleSection = async function() {
  // Bind our capture-phase submit handler before the existing section save handler.
  if (activeSection?.key === 'strengths') bindStrengthsBuilder();
  return strengthsOriginalBind();
};

function bindStrengthsBuilder() {
  const root = document.querySelector('#strengths-builder');
  if (!root) return;
  const form = root.closest('form');
  const items = [...STRENGTHS_LIBRARY.items];
  const selected = new Set();
  const types = [['strength', 'Strengths', 'strengths'], ['growth_or_support_need', 'Weaknesses / Challenges / Support Needs', 'weaknesses']];
  const status = text => root.querySelector('#descriptor-status').textContent = text;
  const choices = type => items.filter(x => x.type === type && selected.has(x.id));
  function preview() {
    root.querySelector('#descriptor-preview').value = types.map(([type, label]) => {
      const group = choices(type);
      return group.length ? `${label}:\n${group.map(x => '• ' + x.label).join('\n')}` : '';
    }).filter(Boolean).join('\n\n');
  }
  function renderOptions() {
    const term = root.querySelector('#descriptor-search').value.trim().toLocaleLowerCase();
    const domain = root.querySelector('#descriptor-domain').value;
    const selectedOnly = root.querySelector('#descriptor-selected-only').checked;
    const visible = items.filter(x => (!domain || x.domain === domain) && (!term || `${x.label} ${x.domain}`.toLocaleLowerCase().includes(term)) && (!selectedOnly || selected.has(x.id)));
    root.querySelector('#descriptor-options').innerHTML = types.map(([type, label]) => {
      const group = visible.filter(x => x.type === type);
      return `<fieldset><legend>${label}</legend><div class="descriptor-scroll">${group.length ? [...new Set(group.map(x => x.domain))].map(d => `<section><h4>${esc(d)}</h4>${group.filter(x => x.domain === d).map(x => `<label class="descriptor-choice"><input type="checkbox" name="descriptor_choice" value="${esc(x.id)}" ${selected.has(x.id) ? 'checked' : ''}><span>${esc(x.label)}</span></label>`).join('')}</section>`).join('') : '<p>No matching descriptors.</p>'}</div></fieldset>`;
    }).join('');
    root.querySelector('#descriptor-count').textContent = `${selected.size} selected · ${visible.length} matching descriptors · ${items.length} available`;
    preview();
  }
  function insert() {
    // Validate both destination lengths before changing either field.
    const updates = types.map(([type, , key]) => {
      const field = form.querySelector(`[data-section-field="${key}"]`);
      const existing = new Set(field.value.split('\n').map(x => x.trim().replace(/^[•*-]\s*/, '')));
      const additions = choices(type).filter(x => !existing.has(x.label)).map(x => '• ' + x.label);
      const value = additions.length ? [field.value, additions.join('\n')].filter(Boolean).join('\n') : field.value;
      if (value.length > field.maxLength) throw Error('The selected wording exceeds the EMR field limit. Insert fewer items or shorten the existing text.');
      return {field, value};
    });
    for (const {field, value} of updates) {
      if (field.value !== value) {field.value = value; field.dispatchEvent(new Event('input', {bubbles: true}));}
    }
    selected.clear();
    renderOptions();
  }
  root.querySelector('#descriptor-options').addEventListener('change', event => {
    const input = event.target.closest('input[name="descriptor_choice"]');
    if (!input) return;
    if (input.checked) selected.add(input.value); else selected.delete(input.value);
    dirty = true;
    // Preserve keyboard focus while updating the preview and count.
    preview();
    root.querySelector('#descriptor-count').textContent = `${selected.size} selected`;
    status('Selections are ready to copy or insert.');
  });
  for (const id of ['descriptor-search', 'descriptor-domain', 'descriptor-selected-only']) {
    root.querySelector('#' + id).addEventListener(id === 'descriptor-search' ? 'input' : 'change', renderOptions);
  }
  root.querySelector('#descriptor-insert').addEventListener('click', () => {
    try {insert(); status('Wording inserted below. Review or edit it, then save the section.');} catch (err) {status(err.message);}
  });
  form.addEventListener('submit', event => {
    try {if (selected.size) insert();} catch (err) {event.preventDefault(); event.stopImmediatePropagation(); status(err.message);}
  }, {capture: true});
  root.querySelector('#descriptor-clear').addEventListener('click', () => {selected.clear(); renderOptions(); status('Selections cleared. Existing EMR field text is retained.');});
  root.querySelector('#descriptor-copy').addEventListener('click', async () => {
    const field = root.querySelector('#descriptor-preview');
    if (!field.value) {status('Select at least one descriptor to copy.'); return;}
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(field.value);
      if (root.isConnected) status('Selected wording copied. Paste it into the desired EMR entry.');
    } catch {
      if (root.isConnected) {field.focus(); field.select(); status('Automatic copy is unavailable. The preview is selected; press Command+C or Ctrl+C to copy.');}
    }
  });
  root.querySelector('#descriptor-add-custom').addEventListener('click', () => {
    const field = root.querySelector('#descriptor-custom-text');
    const type = root.querySelector('#descriptor-custom-type').value;
    const labels = [...new Set(field.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean))];
    if (!labels.length) {status('Paste at least one descriptor, one per line.'); return;}
    if (labels.some(x => x.length > 500) || items.length + labels.length > 500) {status('Use at most 500 characters per descriptor and 500 total available choices.'); return;}
    let added = 0;
    for (const label of labels) {
      if (items.some(x => x.type === type && x.label.toLocaleLowerCase() === label.toLocaleLowerCase())) continue;
      items.push({id: 'CUSTOM-' + items.length, type, label, domain: 'Custom descriptors'}); added++;
    }
    field.value = '';
    root.querySelector('#descriptor-domain').value = 'Custom descriptors';
    root.querySelector('#descriptor-search').value = '';
    root.querySelector('#descriptor-selected-only').checked = false;
    renderOptions();
    status(`${added} custom field items added. Select the applicable items to insert or copy.`);
  });
  renderOptions();
}
