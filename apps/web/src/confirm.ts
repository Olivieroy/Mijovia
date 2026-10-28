/** Dialogue non bloquant, utilisable au clavier, sans alert/confirm du navigateur. */
export function confirmAction(message: string) {
  return ask(message, false) as Promise<boolean>;
}
export function promptAction(message: string) {
  return ask(message, true) as Promise<string | null>;
}
function ask(message: string, text: boolean): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "confirmation";
    const form = document.createElement("form");
    form.method = "dialog";
    const title = document.createElement("h2");
    title.id = "confirmation-title";
    title.textContent = "Confirmer l’action";
    dialog.setAttribute("aria-labelledby", title.id);
    const description = document.createElement("p");
    description.textContent = message;
    const field = document.createElement("input");
    field.setAttribute("aria-label", "Texte de confirmation");
    const buttons = document.createElement("div");
    buttons.className = "actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "secondary";
    cancel.textContent = "Annuler";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Confirmer";
    buttons.append(cancel, submit);
    form.append(title, description);
    if (text) form.append(field);
    form.append(buttons);
    dialog.append(form);
    document.body.append(dialog);
    const close = (value: boolean | string | null) => {
      dialog.close();
      dialog.remove();
      resolve(value);
    };
    cancel.onclick = () => close(text ? null : false);
    dialog.oncancel = (e) => {
      e.preventDefault();
      close(text ? null : false);
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      close(text ? field.value : true);
    };
    dialog.showModal();
    (text ? field : cancel).focus();
  });
}
