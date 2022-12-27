import "./_pera-toast.scss";

import React from "react";
import classNames from "classnames";

interface PeraToastProps {
  message: React.ReactNode;
  customClassName?: string;
}

function PeraToast({message, customClassName}: PeraToastProps) {
  return (
    <div className={classNames("pera-toast", customClassName)}>
      <div>{message}</div>
    </div>
  );
}

export default PeraToast;
