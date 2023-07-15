async function displayUI() {    
    await signIn();

    // Display info from user profile
    const user = await getUser();
    var userName = document.getElementById('userName');
    userName.innerText = user.displayName;  

    // Hide login button and initial UI
    var signInButton = document.getElementById('signin');
    signInButton.style.display = "none"; // Use 'display' instead of 'style'
    var content = document.getElementById('content');
    content.style.display = "block"; // Use 'display' instead of 'style'
    window.location.href = `camera.html?userId=${encodeURIComponent(user.displayName)}`
}

// The displayUI() function retrieves user information using the Azure Active Directory (AAD) authentication flow. The user information typically includes the user's display name, but there are other available user properties as well. Here are some commonly used user properties that you can access:

// user.displayName: The display name of the authenticated user.
// user.email: The email address of the authenticated user.
// user.objectId: The unique identifier (object ID) of the user in Azure Active Directory.
// user.tid: The tenant ID of the user's Azure Active Directory.
// user.upn: The user principal name (UPN) of the authenticated user.