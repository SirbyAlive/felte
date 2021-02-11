import tippy, { Instance, Props } from 'tippy.js';
import type { CurrentForm, ReporterHandler, FormControl, Obj } from 'felte';

const mutationConfig: MutationObserverInit = {
  attributes: true,
  subtree: true,
};

function mutationCallback(mutationList: MutationRecord[]) {
  for (const mutation of mutationList) {
    if (mutation.type !== 'attributes') continue;
    if (mutation.attributeName !== 'data-felte-validation-message') continue;
    const target: any = mutation.target;
    const validationMessage: string = target.dataset.felteValidationMessage;
    const tippyInstance: Instance<Props> = target?._tippy;
    if (!tippyInstance) continue;
    if (validationMessage) {
      tippyInstance.setContent(validationMessage);
      if (document.activeElement === target && !tippyInstance.state.isShown) {
        tippyInstance.show();
      }
      !tippyInstance.state.isEnabled && tippyInstance.enable();
    } else {
      tippyInstance.disable();
    }
  }
}

function isLabelElement(node: Node): node is HTMLLabelElement {
  return node.nodeName === 'LABEL';
}

function getControlLabel(control: FormControl): HTMLLabelElement | undefined {
  const labels = control.labels;
  if (labels[0]) return labels[0];
  const parentNode = control.parentNode;
  if (isLabelElement(parentNode)) return parentNode;
  if (!control.id) return;
  const labelElement = document.querySelector(
    `label[for=${control.id}]`
  ) as HTMLLabelElement;
  return labelElement || undefined;
}

function tippyReporter<Data extends Obj = Obj>(
  currentForm: CurrentForm<Data>
): ReporterHandler<Data> {
  const tippyInstances = currentForm.controls.map((control) => {
    const content = control.dataset.felteValidationMessage;
    const triggerTarget = [control, getControlLabel(control)].filter(Boolean);
    const instance = tippy(control, {
      trigger: 'mouseenter click focusin',
      content,
      triggerTarget,
    });
    if (!content) instance.disable();
    return instance;
  });
  const mutationObserver = new MutationObserver(mutationCallback);
  mutationObserver.observe(currentForm.form, mutationConfig);
  return {
    destroy() {
      mutationObserver.disconnect();
      tippyInstances.forEach((instance) => instance.destroy());
    },
    onSubmitError() {
      const firstInvalidElement = currentForm.form.querySelector(
        '[data-felte-validation-message]'
      ) as FormControl;
      firstInvalidElement.focus();
      const tippyInstance: Instance<Props> = (firstInvalidElement as any)
        ?._tippy;
      if (!tippyInstance || tippyInstance.state.isShown) return;
      tippyInstance.show();
    },
  };
}

export default tippyReporter;