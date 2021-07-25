const inquirer = require('inquirer')
const cTable = require('console.table')
const mysql = require('mysql2')

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'rootroot',
  database: 'employeeDB'
})

const start = () => {
  inquirer
    .prompt({
      name: 'action',
      type: 'list',
      message: 'What would you like to do?',
      choices: [
        'View All Employees',
        'View All Departments',
        'View All Roles',
        'Add Employee',
        'Add Role',
        'Add Department',
        'Update Employee Role',
        'EXIT'
      ]
    })
    .then((answer) => {
      switch (answer.action) {
        case 'View All Departments':
          viewDepartments()
          break
        case 'View All Roles':
          viewRoles()
          break
        case 'View All Employees':
          viewEmployees()
          break
        case 'Add Department':
          addDepartment()
          break
        case 'Add Role':
          addRole()
          break
        case 'Add Employee':
          addEmployee()
          break
        case 'Update Employee Role':
          updateRole()
          break
        case 'EXIT':
          connection.end()
          break
        default:
          console.log(`Invalid action: ${answer.action}`)
          break
      }
    })
}

const viewDepartments = () => {
  connection.query('SELECT * FROM department', (err, res) => {
    if (err) throw err
    const values = [['id', 'department']]
    res.forEach(({ id, name }) => {
      values.push([`${id}`, `${name}`])
    })
    console.table(values[0], values.slice(1))
    start()
  })
}

const viewRoles = () => {
  let query =
    'SELECT role.id, role.title, role.salary, department.name '
  query +=
    'FROM role INNER JOIN department ON role.department_id = department.id'
  connection.query(query, (err, res) => {
    if (err) throw err
    const values = [['id', 'title', 'salary', 'department']]
    res.forEach(({ id, title, salary, name }) => {
      values.push([`${id}`, `${title}`, `${salary}`, `${name}`])
    })
    console.table(values[0], values.slice(1))
    start()
  })
}

const viewEmployees = () => {
  let query =
    'SELECT e.id, e.first_name AS eFirstName, e.last_name AS eLastName, role.title, role.salary, department.name, m.first_name AS mFirstName, m.last_name AS mLastName '
  query +=
    'FROM employee e INNER JOIN role ON e.role_id = role.id '
  query +=
    'INNER JOIN department ON role.department_id = department.id '
  query +=
    'LEFT JOIN employee m ON e.manager_id = m.id'
  connection.query(query, (err, res) => {
    if (err) throw err
    const values = [['id', 'first_name', 'last_name', 'title', 'salary', 'department', 'manager']]
    res.forEach(({ id, eFirstName, eLastName, title, salary, name, mFirstName, mLastName }) => {
      let mFullName
      if (mFirstName === null || mLastName === null) {
        mFullName = ''
      } else {
        mFullName = `${mFirstName} ${mLastName}`
      }
      values.push([`${id}`, `${eFirstName}`, `${eLastName}`, `${title}`, `${salary}`, `${name}`, `${mFullName}`])
    })
    console.table(values[0], values.slice(1))
    start()
  })
}

const addDepartment = () => {
  inquirer
    .prompt([
      {
        name: 'name',
        type: 'input',
        message: 'What department would you like to add?'
      }
    ])
    .then((answer) => {
      connection.query(
        'INSERT INTO department SET ?',
        {
          name: answer.name
        },
        (err) => {
          if (err) throw err
          console.log('Your department was created successfully!')
          start()
        }
      )
    })
}

const addRole = () => {
  connection.query('SELECT * FROM department', (err, results) => {
    if (err) throw err
    inquirer
      .prompt([
        {
          name: 'title',
          type: 'input',
          message: 'What role would you like to add?'
        },
        {
          name: 'salary',
          type: 'input',
          message: 'How much is the salary for the role?'
        },
        {
          name: 'department_id',
          type: 'list',
          choices () {
            const choiceArray = []
            results.forEach(({ name }) => {
              choiceArray.push(name)
            })
            return choiceArray
          },
          message: 'What department does the role belong to?'
        }
      ])
      .then((answer) => {
        let chosenItem
        results.forEach((item) => {
          if (item.name === answer.department_id) {
            chosenItem = item
          }
        })
        connection.query(
          'INSERT INTO role SET ?',
          {
            title: answer.title,
            salary: answer.salary,
            department_id: chosenItem.id
          },
          (err) => {
            if (err) throw err
            console.log('Role successfully created!')
            start()
          }
        )
      })
  })
}

const addEmployee = () => {
  connection.query('SELECT * FROM role', (err, results) => {
    if (err) throw err
    inquirer
      .prompt([
        {
          name: 'first_name',
          type: 'input',
          message: "What is the employee's first name?"
        },
        {
          name: 'last_name',
          type: 'input',
          message: "What is the employee's last name?"
        },
        {
          name: 'roleTitle',
          type: 'list',
          choices () {
            const choiceArray = []
            results.forEach(({ title }) => {
              choiceArray.push(title)
            })
            return choiceArray
          },
          message: "What is the employee's role?"
        }
      ])
      .then((answer) => {
        const firstName = answer.first_name
        const lastName = answer.last_name

        let chosenRole
        results.forEach((item) => {
          if (item.title === answer.roleTitle) {
            chosenRole = item
          }
        })
        connection.query('SELECT * FROM employee', (err, results) => {
          if (err) throw err
          inquirer
            .prompt([
              {
                name: 'managerName',
                type: 'list',
                choices () {
                  const choiceArray = ['None']
                  results.forEach(({ first_name, last_name }) => {
                    choiceArray.push(`${first_name} ${last_name}`)
                  })
                  return choiceArray
                },
                message: "Who is the employee's manager?"
              }
            ])
            .then((answer) => {
              let chosenManager
              if (answer.managerName === 'None') {
                chosenManager = {}
              } else {
                results.forEach((item) => {
                  if (`${item.first_name} ${item.last_name}` === answer.managerName) {
                    chosenManager = item
                  }
                })
              }
              connection.query(
                'INSERT INTO employee SET ?',
                {
                  first_name: firstName,
                  last_name: lastName,
                  role_id: chosenRole.id,
                  manager_id: chosenManager.id
                },
                (err) => {
                  if (err) throw err
                  console.log('Employee successfully created!')
                  start()
                }
              )
            })
        })
      })
  })
}

const updateRole = () => {
  connection.query('SELECT * FROM employee', (err, results) => {
    if (err) throw err
    inquirer
      .prompt([
        {
          name: 'employeeName',
          type: 'list',
          choices () {
            const choiceArray = []
            results.forEach(({ first_name, last_name }) => {
              choiceArray.push(`${first_name} ${last_name}`)
            })
            return choiceArray
          },
          message: 'Which employee would you like to update?'
        }
      ])
      .then((answer) => {
        let chosenEmployee
        results.forEach((item) => {
          if (`${item.first_name} ${item.last_name}` === answer.employeeName) {
            chosenEmployee = item
          }
        })
        connection.query('SELECT * FROM role', (err, results) => {
          if (err) throw err
          inquirer
            .prompt([
              {
                name: 'roleTitle',
                type: 'list',
                choices () {
                  const choiceArray = []
                  results.forEach(({ title }) => {
                    choiceArray.push(title)
                  })
                  return choiceArray
                },
                message: "What is the employee's new role?"
              }
            ])
            .then((answer) => {
              let chosenRole
              results.forEach((item) => {
                if (item.title === answer.roleTitle) {
                  chosenRole = item
                }
              })
              connection.query(
                'UPDATE employee SET ? WHERE ?',
                [
                  {
                    role_id: chosenRole.id
                  },
                  {
                    id: chosenEmployee.id
                  }
                ],
                (err) => {
                  if (err) throw err
                  console.log("The employee's role was updated successfully!")
                  start()
                }
              )
            })
        })
      })
  })
}

connection.connect((err) => {
  if (err) throw err
  console.log(`Connected as id ${connection.threadId}`)
  start()
})
