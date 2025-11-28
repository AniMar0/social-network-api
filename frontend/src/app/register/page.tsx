// src/app/register/page.tsx
export default function RegisterPage() {
  return (
    <main style={{ maxWidth: "500px", margin: "2rem auto", padding: "1rem" }}>
      <h1>Register</h1>
      <form>
        {/* Email */}
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        {/* Password */}
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>
        {/* First Name */}
        <div>
          <label htmlFor="firstName">First Name</label>
          <input id="firstName" name="firstName" type="text" required />
        </div>
        {/* Last Name */}
        <div>
          <label htmlFor="lastName">Last Name</label>
          <input id="lastName" name="lastName" type="text" required />
        </div>
        {/* Date of Birth */}
        <div>
          <label htmlFor="dob">Date of Birth</label>
          <input id="dob" name="dob" type="date" required />
        </div>
        {/* Avatar / Image (optional) */}
        <div>
          <label htmlFor="avatar">Avatar (optional)</label>
          <input id="avatar" name="avatar" type="file" accept="image/*" />
        </div>
        {/* Nickname (optional) */}
        <div>
          <label htmlFor="nickname">Nickname (optional)</label>
          <input id="nickname" name="nickname" type="text" />
        </div>
        {/* About Me (optional) */}
        <div>
          <label htmlFor="about">About Me (optional)</label>
          <textarea id="about" name="about" rows={4}></textarea>
        </div>
        {/* Submit button */}
        <button type="submit">Register</button>
      </form>
    </main>
  )
}

  