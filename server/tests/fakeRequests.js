
const fakeGetApiUsers = () => {
    return fetch('http://localhost:8080/api/users/', {
        method: 'GET'
    }).then((response) => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }).then(data => {
        console.log('Users fetched successfully:', data);
        return data;
    })
    .catch((error) => console.error('Error fetching users:', error));
}

const fakePostApiUsers = (userName) => {
    const url = 'http://localhost:8080/api/users/';
    return fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
            name: userName
        })
    }).then((response) => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }).then(data => {
        console.log('User created successfully:', data);
        return data;
    })
    .catch((error) => console.error('Error creating user:', error));
}

const fakeDeleteApiUsers = (userId) => {
    const url = `http://localhost:8080/api/users/${userId}`;
    return fetch(url, {
        method: 'DELETE'
    }).then((response) => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        console.log('User deleted successfully');
    })
    .catch((error) => console.error('Error deleting user:', error));
}

fakeGetApiUsers();

const name = 'robercik';
// fakePostApiUsers(name);

const userId = 3;
// fakeDeleteApiUsers(userId);