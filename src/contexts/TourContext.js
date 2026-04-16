import React, { createContext, useRef, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const TourContext = createContext(null);

export const TourProvider = ({ children }) => {
  const stepsRef = useRef({});
  const driverObjRef = useRef(null); // Store the driver instance
  const [tourIsActive, setTourIsActive] = useState(false);

  const tourRegisterSteps = (key, steps) => {
    stepsRef.current[key] = steps;
  };

  const tourStart = (keys) => {
    const steps = keys.flatMap((key) => stepsRef.current[key] || []);

    if (!steps.length) return;
    setTourIsActive(true);

    driverObjRef.current = driver({
      showProgress: true,
      animate: true,
      overlayOpacity: 0.6,
      steps,
      onDestroyed: () => {
        setTourIsActive(false);
      },
    });

    driverObjRef.current.drive();
  };

  const tourMoveNext = () => {
    if (driverObjRef.current) {
      driverObjRef.current.moveNext();
    }
  };

  return (
    <TourContext.Provider value={{ tourRegisterSteps, tourStart, tourMoveNext, tourIsActive }}>
      {children}
    </TourContext.Provider>
  );
};