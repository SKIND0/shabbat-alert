import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Signup from './Signup';
import ManageAlerts from './ManageAlerts';
import AlertPreferences from './AlertPreferences';
import SignupSuccess from './SignupSuccess';


function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signup/success" element={<SignupSuccess />} />
                <Route path="/manage" element={<ManageAlerts />} />
                <Route path="/preferences" element={<AlertPreferences />} />
                <Route path="/home" element={<Home />} />


            </Routes>
        </BrowserRouter>
    );
}

export default App;