import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children, role }) => {
  // Dynamically get the stored role from localStorage
  const userId = localStorage.getItem(`${role}Id`);  // Use role dynamically

  // Check if userId exists for the specified role
  if (!userId) {
    // If userId is not found for the given role, redirect to the login page
    return <Navigate to={`/${role}login`} />;
  }

  // If authenticated, allow access to the route
  return children;
};

export default PrivateRoute;

