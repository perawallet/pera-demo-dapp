import {useCallback, useState} from "react";

const useModalVisibilityState = () => {
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
};

export default useModalVisibilityState;
