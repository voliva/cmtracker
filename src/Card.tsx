import { FC } from "react";

export const Card: FC<{ className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={"bg-gray-50 shadow-md p-3 rounded " + className}>
    {children}
  </div>
);
