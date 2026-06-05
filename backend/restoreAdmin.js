const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Employee = require('./models/Employee');

async function restoreAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        await Employee.findOneAndUpdate(
            { email: 'admin@ems.com' },
            {
                name: 'Super Admin',
                email: 'admin@ems.com',
                password: hashedPassword,
                role: 'Admin',
                department: 'Management'
            },
            { upsert: true, new: true }
        );

        console.log("Admin restored! Email: admin@ems.com | Password: admin123");
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

restoreAdmin();