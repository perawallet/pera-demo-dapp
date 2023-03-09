import "./_modal.scss";

import React, {useEffect} from "react";
import ReactModal from "react-modal";
import classNames from "classnames";

type ModalProps = Omit<
  ReactModal.Props,
  "contentLabel" | "onRequestClose" | "parentSelector" | "className"
> & {
  contentLabel: string;
  onClose: ReactModal.Props["onRequestClose"];
  customClassName?: string;
  shouldPreventScrollOnOverlay?: boolean;
  children?: React.ReactNode;
};

const MODAL_CLOSE_TIMEOUT =
  parseFloat(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--modal-transition-duration")
      .trim() || "0.2"

    // eslint-disable-next-line no-magic-numbers
  ) * 2000;

ReactModal.defaultStyles = {};
ReactModal.setAppElement("#root");

function getParent() {
  return document.querySelector("#modal-root") as HTMLElement;
}

function Modal({
  customClassName,
  children,
  closeTimeoutMS = MODAL_CLOSE_TIMEOUT,
  shouldCloseOnOverlayClick = true,
  shouldCloseOnEsc = false,
  bodyOpenClassName,
  onClose,
  shouldPreventScrollOnOverlay = true,
  isOpen,
  ...otherProps
}: ModalProps) {
  useEffect(() => {
    if (shouldPreventScrollOnOverlay && isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      if (shouldPreventScrollOnOverlay) {
        document.body.style.overflow = "unset";
      }
    };
  }, [isOpen, shouldPreventScrollOnOverlay]);

  return (
    // This wrapper div and click handler is added to stop any click events from bubbling outside of the modal
    // eslint-disable-next-line
    <div style={{position: "absolute"}} onClick={(event) => event.stopPropagation()}>
      <ReactModal
        parentSelector={getParent}
        isOpen={isOpen}
        className={classNames("modal", customClassName)}
        onRequestClose={handleRequestClose}
        closeTimeoutMS={closeTimeoutMS}
        bodyOpenClassName={classNames("ReactModal__Body--open", bodyOpenClassName)}
        shouldCloseOnOverlayClick={shouldCloseOnOverlayClick}
        shouldCloseOnEsc={shouldCloseOnEsc}
        {...otherProps}>
        {children}
      </ReactModal>
    </div>
  );

  function handleRequestClose(
    event: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<Element>
  ) {
    if (onClose && (shouldCloseOnOverlayClick || shouldCloseOnEsc)) {
      onClose(event);
    }
  }
}

export default Modal;
