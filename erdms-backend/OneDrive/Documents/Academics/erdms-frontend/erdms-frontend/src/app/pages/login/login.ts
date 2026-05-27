import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../services/state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  loginEmail = '';
  loginPassword = '';

  constructor(private router: Router, private state: StateService) {}

  executeAuthentication() {
    const email = this.loginEmail ? this.loginEmail.trim() : '';
    const password = this.loginPassword ? this.loginPassword.trim() : '';

    console.log('Attempting sign-in with:', email, password);

    // 1. Check for empty inputs
    if (!email || !password) {
      alert(`Validation Error: Please fill in both fields.\nTyped Email: "${email}"\nTyped Password: "${password}"`);
      return;
    }

    // 2. Ensure state data array is populated
    if (!this.state.usersTable || this.state.usersTable.length === 0) {
      alert('System Error: The global mock database array is completely empty! Please restart your local server.');
      return;
    }

    // 3. Search for the account
    const matchedUser = this.state.usersTable.find(
      u => u.email.toLowerCase() === email.toLowerCase() && 
           u.password === password
    );

    if (matchedUser) {
      if (matchedUser.status !== 'Active') {
        alert('Access Denied: This account has been deactivated.');
        return;
      }

      // Track current session index globally
      this.state.currentUserUID = matchedUser.UID;
      this.state.writeLogEntry(matchedUser.UID, 'Successfully authorized security handshake via login panel.');

      // 🔀 ROUTING BOUND MATRIX
      if (matchedUser.role_id === 1) {
        alert(`Success! Logging in as Admin: ${matchedUser.name}`);
        this.router.navigate(['/admin/dashboard']);
      } else {
        alert(`Success! Logging in as Standard User: ${matchedUser.name}`);
        this.router.navigate(['/user/dashboard']);
      }

    } else {
      // Create a helpful hint printout so you know what accounts exist
      const availableEmails = this.state.usersTable.map(u => u.email).join('\n• ');
      alert(`Invalid Credentials!\n\nYou entered:\nEmail: ${email}\nPassword: ${password}\n\nAvailable mock users in system:\n• ${availableEmails}`);
    }
  }
}