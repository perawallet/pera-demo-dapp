import {useCallback, useState} from "react";

function useModalVisibilityState() {
  const [isModalOpen, setModalVisibility] = useState(false);

  return {
    isModalOpen,
    setModalVisibility,
    openModal: useCallback(() => {
      setModalVisibility(true);
    }, [setModalVisibility]),
    closeModal: useCallback(() => {
      setModalVisibility(false);
    }, [setModalVisibility])
  };
}

export default useModalVisibilityState;
