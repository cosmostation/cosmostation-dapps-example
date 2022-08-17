import { Modal } from "./modal";
import ReactDom from "react-dom";

export class CosmostationWCModal {
  open(uri: string, cb: any) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("id", "cosmostation-wc-modal");
    document.body.appendChild(wrapper);

    ReactDom.render(
      <Modal
        uri={uri}
        close={() => {
          this.close();
          cb();
        }}
      />,
      wrapper
    );
  }

  close() {
    const wrapper = document.getElementById("cosmostation-wc-modal");
    if (wrapper) {
      document.body.removeChild(wrapper);
    }
  }
}

export default CosmostationWCModal;
