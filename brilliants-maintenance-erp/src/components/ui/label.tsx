"use client";

import * as React from "react";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={
      "text-sm font-medium leading-none text-gray-900 " + (className ?? "")
    }
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
